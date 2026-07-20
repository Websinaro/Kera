const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },

    // ---- Usage / rate-limit state ----
    // When the user's 2-hour session started. Set on their very first
    // message ever, or after a previous session has expired.
    sessionStart: { type: Date, default: null },

    // Rolling 30-minute window used to cap messages (e.g. 25 / 30 min).
    windowStart: { type: Date, default: null },
    windowCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
