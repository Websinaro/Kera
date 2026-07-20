require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const shareRoutes = require("./routes/share");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    chatModel: process.env.HF_MODEL,
    imageModel: process.env.HF_IMAGE_MODEL,
    service: "kera-chat-backend",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/share", shareRoutes);

// Serve the built React frontend (dist) if present, so this single
// service can be deployed as one free-tier web app.
const distPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) next();
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("[error]", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("[server] failed to start:", err.message);
    process.exit(1);
  });
