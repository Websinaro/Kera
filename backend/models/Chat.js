const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New chat", trim: true, maxlength: 120 },

    // Per-chat custom instructions (system prompt), set by the user.
    instructions: { type: String, default: "", maxlength: 4000 },

    // "Image-based memory": once the user uploads a reference image, every
    // /image command in this chat edits it instead of starting from
    // scratch, until they clear it.
    referenceImageUrl: { type: String, default: null },

    // Sharing
    shareToken: { type: String, default: null, index: true },
    shareExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);
