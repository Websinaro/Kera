const express = require("express");
const archiver = require("archiver");
const auth = require("../middleware/auth");
const { isAdmin } = require("../utils/admin");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const router = express.Router();

// ---------------------------------------------------------------------
// TESTING-ONLY FEATURE
//
// Full chat export (all users, or a single user) as JSON/zip. This is a
// debugging/QA tool, not a product feature - it is hard-disabled the
// moment NODE_ENV is "production", regardless of who's asking, and it's
// also gated behind admin-only auth on top of that. To turn it on in a
// non-production environment it "just works"; to force it off anywhere
// (including local/staging) set CHAT_EXPORT_ENABLED=false explicitly.
// ---------------------------------------------------------------------
function exportEnabled() {
  // Hard rule: never available in production, no override possible.
  if (process.env.NODE_ENV === "production") return false;
  // Outside production it's on by default, but can still be force-disabled.
  return process.env.CHAT_EXPORT_ENABLED !== "false";
}

// All admin routes require a valid logged-in user first.
router.use(auth);

// Every route below also requires: (a) an admin account, and (b) the
// export feature to be enabled for this environment.
router.use((req, res, next) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: "Admins only." });
  }
  if (!exportEnabled()) {
    return res.status(403).json({ error: "Chat export is disabled in production." });
  }
  next();
});

// ---- Feature flag check (frontend uses this to decide whether to show
//      any export UI at all) ----
router.get("/export-status", (req, res) => {
  res.json({ enabled: true }); // reaching this line already proved admin + enabled
});

// ---- List users, for picking who to export a single chat-history for ----
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().select("username email createdAt").sort({ createdAt: -1 });
    const chatCounts = await Chat.aggregate([{ $group: { _id: "$user", count: { $sum: 1 } } }]);
    const countByUser = new Map(chatCounts.map((c) => [String(c._id), c.count]));

    res.json({
      users: users.map((u) => ({
        id: u._id,
        username: u.username,
        email: u.email,
        createdAt: u.createdAt,
        chatCount: countByUser.get(String(u._id)) || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Serializes one user's chats + messages into the export JSON shape.
// Image messages carry their Cloudinary (or fallback data-URL) address
// in both `content` (matching the raw DB field) and `imageUrl` (an
// explicit alias, since that's what this export is for).
async function buildUserExport(user) {
  const chats = await Chat.find({ user: user._id }).sort({ createdAt: 1 });
  const chatExports = [];

  for (const chat of chats) {
    const messages = await Message.find({ chat: chat._id }).sort({ createdAt: 1 });
    chatExports.push({
      id: chat._id,
      title: chat.title,
      instructions: chat.instructions,
      referenceImageUrl: chat.referenceImageUrl || null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages: messages.map((m) => ({
        id: m._id,
        role: m.role,
        type: m.type,
        content: m.content,
        imageUrl: m.type === "image" ? m.content : null,
        imagePrompt: m.imagePrompt || null,
        liked: m.liked,
        createdAt: m.createdAt,
      })),
    });
  }

  return {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    },
    chatCount: chatExports.length,
    messageCount: chatExports.reduce((sum, c) => sum + c.messages.length, 0),
    chats: chatExports,
  };
}

function safeSlug(str) {
  return String(str || "user").replace(/[^a-z0-9_-]/gi, "_").slice(0, 40);
}

function startZip(res, zipFilename) {
  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${zipFilename}"`,
  });
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    throw err;
  });
  archive.pipe(res);
  return archive;
}

// ---- Export ALL users' chats as one zip, one JSON file per user ----
router.get("/export/all", async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const archive = startZip(res, `kera-chat-export-all-${timestamp}.zip`);

    const manifest = {
      exportedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      userCount: users.length,
      users: [],
    };

    for (const user of users) {
      const data = await buildUserExport(user);
      manifest.users.push({
        id: data.user.id,
        username: data.user.username,
        chatCount: data.chatCount,
        messageCount: data.messageCount,
      });
      archive.append(JSON.stringify(data, null, 2), {
        name: `users/${safeSlug(user.username)}-${user._id}.json`,
      });
    }

    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

// ---- Export a SINGLE user's chats as a zip containing one JSON file ----
router.get("/export/user/:userId", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const data = await buildUserExport(user);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const zipName = `kera-chat-export-${safeSlug(user.username)}-${timestamp}.zip`;
    const archive = startZip(res, zipName);

    archive.append(JSON.stringify(data, null, 2), {
      name: `${safeSlug(user.username)}.json`,
    });
    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
