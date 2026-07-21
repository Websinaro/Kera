const axios = require("axios");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Fallback chat backend, only used when every configured HF token has
 * failed (e.g. free monthly quota exhausted). Text only - Gemini is never
 * used for image generation.
 */
async function generateGeminiReply(systemInstructions, history) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const contents = history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const { data } = await axios.post(
    `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      system_instruction: { parts: [{ text: systemInstructions }] },
      contents,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 512 },
    },
    { headers: { "Content-Type": "application/json" }, timeout: 30000 }
  );

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}

module.exports = { generateGeminiReply };
