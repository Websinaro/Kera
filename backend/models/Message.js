const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },

    // "text" = normal markdown reply, "image" = content is a base64 data
    // URL of a generated image (from the /image command).
    type: { type: String, enum: ["text", "image"], default: "text" },
    imagePrompt: { type: String, default: null },

    // null = no reaction yet, true = liked, false = disliked
    liked: { type: Boolean, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
