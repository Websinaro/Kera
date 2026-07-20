const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New chat", trim: true, maxlength: 120 },

    // Per-chat custom instructions (system prompt), set by the user.
    instructions: { type: String, default: "", maxlength: 4000 },

    // Sharing
    shareToken: { type: String, default: null, index: true },
    shareExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);
