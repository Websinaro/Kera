const { getClient, getAllTokens } = require("./hfClient");
const { generateGeminiReply } = require("./gemini");

// Model id to chat with. Defaults to a widely-mirrored, ungated model so it
// has the best chance of being live on at least one Inference Provider.
// Always double check on the model's HF page ("Inference Providers" panel)
// before relying on a different one.
const HF_MODEL = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";
// Optional: pin a specific provider (e.g. "together", "novita", "fireworks-ai").
// Leave unset to let Hugging Face auto-pick whichever provider is live.
const HF_CHAT_PROVIDER = process.env.HF_CHAT_PROVIDER || undefined;

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
  If they've uploaded a reference image, /image will edit that image instead
  of starting from scratch.

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
  return {
    system,
    messages: [
      { role: "system", content: system },
      ...history.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
    ],
  };
}

/**
 * Chat generation with a three-step fallback chain, so a single free-tier
 * quota running out doesn't take the app down:
 *   1. HF_TOKEN            (first Hugging Face account's free quota)
 *   2. HF_TOKEN_2          (second Hugging Face account's free quota)
 *   3. Gemini free API     (text-only fallback, no image support)
 * The model is never loaded into this server's own process/RAM in any of
 * these cases - everything runs on the provider's infrastructure.
 */
async function generateReply(systemInstructions, history) {
  const { system, messages } = buildMessages(systemInstructions, history);
  const tokens = getAllTokens();
  const errors = [];

  for (const token of tokens) {
    try {
      const client = getClient(token);
      const result = await client.chatCompletion({
        model: HF_MODEL,
        provider: HF_CHAT_PROVIDER,
        messages,
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.9,
      });
      const text = result?.choices?.[0]?.message?.content || "";
      if (text) return cleanUp(text);
      errors.push("HF returned an empty response.");
    } catch (err) {
      errors.push(`HF: ${err.message}`);
    }
  }

  // Every HF token failed (or none configured) - fall back to Gemini.
  try {
    const text = await generateGeminiReply(system, history);
    return cleanUp(text);
  } catch (err) {
    errors.push(`Gemini: ${err.message}`);
  }

  throw new Error(errors.join(" | "));
}

function cleanUp(text) {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

module.exports = { generateReply };
