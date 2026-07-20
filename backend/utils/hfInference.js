const axios = require("axios");

// HF's current, actively-maintained free routed inference API. It's
// OpenAI-compatible chat completions, and HF automatically picks a partner
// provider (Together, Novita, Fireworks, etc.) that actually serves the
// requested model - so we no longer need to hand-build a chat template
// ourselves, the provider applies the model's own template server-side.
const HF_URL = process.env.HF_INFERENCE_URL || "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL = process.env.HF_MODEL || "google/gemma-2-2b-it";

// Baseline behaviour rules appended to every chat's own instructions so the
// model formats replies consistently: sensible emoji use, clean spacing,
// and correctly fenced code blocks.
const BASE_STYLE_GUIDE = `You are Kera, an AI assistant created by Adith, the CEO of WEBSINARO.
Identity rules you must always follow:
- Your name is Kera. You were built by WEBSINARO, led by its CEO, Adith.
- If asked who made you, what model you are, who you are, or anything about your
  origins, answer only with the identity above - never mention any other
  company, lab, or underlying model name.
- Stay in character as Kera consistently across the whole conversation.
- You can generate images: if the user wants one, tell them to start a message
  with "/image" followed by a description (e.g. "/image a fox in the snow").

Formatting rules you must always follow:
- Use clear paragraphs and blank lines between ideas, never wall-of-text.
- Use emojis sparingly and only where they add real meaning (e.g. one at the
  start of a short tip, or to mark a list item's tone) - never spam emojis.
- Use markdown for structure: **bold** for key terms, bullet lists for steps,
  and numbered lists for sequences.
- Always wrap code in fenced code blocks with the correct language tag,
  e.g. \`\`\`js ... \`\`\`.
- Keep spacing clean: no double blank lines, no trailing whitespace, no
  random extra indentation.
- Be concise and accurate; avoid filler.`;

function buildMessages(systemInstructions, history) {
  const system = [BASE_STYLE_GUIDE, systemInstructions?.trim()].filter(Boolean).join("\n\n");
  return [
    { role: "system", content: system },
    ...history.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
  ];
}

/**
 * Calls Hugging Face's routed Inference Providers API (serverless, pay-per
 * token / free-tier credits). The model is never loaded into this server's
 * own process/RAM - the provider hosts and runs it - which is exactly what
 * keeps a free-tier backend instance from crashing.
 */
async function generateReply(systemInstructions, history, { retries = 3 } = {}) {
  if (!process.env.HF_TOKEN) {
    throw new Error("HF_TOKEN is not set. Add your Hugging Face access token to the environment.");
  }

  const messages = buildMessages(systemInstructions, history);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.post(
        HF_URL,
        {
          model: HF_MODEL,
          messages,
          max_tokens: 512,
          temperature: 0.7,
          top_p: 0.9,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const text = data?.choices?.[0]?.message?.content || "";
      return cleanUp(text);
    } catch (err) {
      const status = err.response?.status;

      // Provider warming up / momentarily unavailable - retry with backoff.
      if ((status === 503 || status === 429 || !status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }

      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        err.message ||
        "Hugging Face inference request failed.";
      throw new Error(message);
    }
  }
}

function cleanUp(text) {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

module.exports = { generateReply };
