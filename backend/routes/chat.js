const express = require("express");
const { nanoid } = require("nanoid");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const auth = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");
const { generateReply } = require("../utils/hfInference");
const { generateImage } = require("../utils/hfImage");

const router = express.Router();
const SHARE_TTL_MS = (Number(process.env.SHARE_LINK_TTL_HOURS) || 2) * 60 * 60 * 1000;

// All routes below require auth
router.use(auth);

// ---- List chats ----
router.get("/", async (req, res, next) => {
  try {
    const chats = await Chat.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ chats });
  } catch (err) {
    next(err);
  }
});

// ---- Create chat ----
router.post("/", async (req, res, next) => {
  try {
    const { title, instructions } = req.body;
    const chat = await Chat.create({
      user: req.user._id,
      title: title || "New chat",
      instructions: instructions || "",
    });
    res.status(201).json({ chat });
  } catch (err) {
    next(err);
  }
});

// ---- Get one chat + its messages ----
router.get("/:id", async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const messages = await Message.find({ chat: chat._id }).sort({ createdAt: 1 });
    res.json({ chat, messages });
  } catch (err) {
    next(err);
  }
});

// ---- Update chat instructions / title ----
router.put("/:id", async (req, res, next) => {
  try {
    const { title, instructions } = req.body;
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    if (typeof title === "string") chat.title = title;
    if (typeof instructions === "string") chat.instructions = instructions;
    await chat.save();

    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

// ---- Delete chat ----
router.delete("/:id", async (req, res, next) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });
    await Message.deleteMany({ chat: chat._id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---- Send a message and get the model's reply ----
router.post("/:id/messages", rateLimit, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content is required." });
    }

    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const userMessage = await Message.create({
      chat: chat._id,
      role: "user",
      content: content.trim(),
    });

    // Auto-title the chat from the first message
    if (chat.title === "New chat") {
      chat.title = content.trim().slice(0, 60);
    }
    chat.updatedAt = new Date();
    await chat.save();

    const history = await Message.find({ chat: chat._id }).sort({ createdAt: 1 }).limit(40);

    const imageMatch = content.trim().match(/^\/(image|img)\b\s*([\s\S]*)$/i);

    let assistantMessage;

    if (imageMatch) {
      // ---- "/image <prompt>" -> generate an image instead of text ----
      const imagePrompt = imageMatch[2].trim();

      if (!imagePrompt) {
        assistantMessage = await Message.create({
          chat: chat._id,
          role: "assistant",
          content: "Tell me what to draw! For example: `/image a fox curled up in the snow, soft lighting` 🎨",
        });
      } else {
        try {
          const dataUrl = await generateImage(imagePrompt);
          assistantMessage = await Message.create({
            chat: chat._id,
            role: "assistant",
            type: "image",
            content: dataUrl,
            imagePrompt,
          });
        } catch (genErr) {
          console.error("[chat] generateImage failed:", genErr.message);
          assistantMessage = await Message.create({
            chat: chat._id,
            role: "assistant",
            content: `⚠️ Sorry, I couldn't generate that image right now (${genErr.message}). Please try again in a few seconds.`,
          });
        }
      }
    } else {
      // ---- Normal text reply ----
      try {
        const replyText = await generateReply(
          chat.instructions,
          history.map((m) => ({ role: m.role, content: m.content }))
        );
        assistantMessage = await Message.create({
          chat: chat._id,
          role: "assistant",
          content: replyText,
        });
      } catch (genErr) {
        console.error("[chat] generateReply failed:", genErr.message);
        assistantMessage = await Message.create({
          chat: chat._id,
          role: "assistant",
          content: `⚠️ Sorry, I couldn't generate a reply right now (${genErr.message}). Please try again in a few seconds.`,
        });
      }
    }

    res.status(201).json({
      userMessage,
      assistantMessage,
      usage: req.usage,
    });
  } catch (err) {
    next(err);
  }
});

// ---- Like / dislike a message ----
router.post("/messages/:messageId/react", async (req, res, next) => {
  try {
    const { liked } = req.body; // true, false, or null to clear
    const message = await Message.findById(req.params.messageId).populate("chat");
    if (!message || String(message.chat.user) !== String(req.user._id)) {
      return res.status(404).json({ error: "Message not found." });
    }
    message.liked = liked;
    await message.save();
    res.json({ message });
  } catch (err) {
    next(err);
  }
});

// ---- Create / refresh a share link (valid for SHARE_TTL_MS) ----
router.post("/:id/share", async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    chat.shareToken = nanoid(12);
    chat.shareExpiresAt = new Date(Date.now() + SHARE_TTL_MS);
    await chat.save();

    res.json({ shareToken: chat.shareToken, shareExpiresAt: chat.shareExpiresAt });
  } catch (err) {
    next(err);
  }
});

// ---- Revoke a share link ----
router.delete("/:id/share", async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    chat.shareToken = null;
    chat.shareExpiresAt = null;
    await chat.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
