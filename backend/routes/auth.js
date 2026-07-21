const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { computeUsage } = require("../middleware/rateLimit");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function publicUser(user, usage) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    isAdmin: !!usage?.isAdmin,
    usage,
  };
}

router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email and password are all required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) {
      return res.status(409).json({ error: "Username or email already in use." });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email: email.toLowerCase(), password: hash });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user, computeUsage(user)) });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user, computeUsage(user)) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", auth, async (req, res) => {
  res.json({ user: publicUser(req.user, computeUsage(req.user)) });
});

module.exports = router;
