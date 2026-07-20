const express = require("express");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const router = express.Router();

// Public, read-only view of a shared chat. No auth required, but the link
// only works while shareExpiresAt is in the future.
router.get("/:token", async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ shareToken: req.params.token });
    if (!chat || !chat.shareExpiresAt || chat.shareExpiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "This share link has expired or does not exist." });
    }

    const messages = await Message.find({ chat: chat._id }).sort({ createdAt: 1 });
    res.json({
      title: chat.title,
      expiresAt: chat.shareExpiresAt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        type: m.type,
        imagePrompt: m.imagePrompt,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
