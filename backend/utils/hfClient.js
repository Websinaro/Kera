const { InferenceClient } = require("@huggingface/inference");

const clients = new Map();

/**
 * The official HF SDK auto-routes each request to whichever partner
 * provider (Together, fal.ai, Novita, Fireworks, etc.) actually serves the
 * requested model, and speaks each provider's exact request/response shape
 * for us - which hand-rolled REST calls to a hardcoded provider can't do
 * reliably, since providers come and go and their APIs aren't standardized
 * (especially for image generation).
 *
 * Accepts an explicit token so callers can rotate between multiple HF
 * accounts (each with its own free monthly quota) instead of being capped
 * by a single token.
 */
function getClient(token) {
  const t = token || process.env.HF_TOKEN;
  if (!t) {
    throw new Error("HF_TOKEN is not set. Add your Hugging Face access token to the environment.");
  }
  if (!clients.has(t)) {
    clients.set(t, new InferenceClient(t));
  }
  return clients.get(t);
}

/**
 * All configured HF tokens in priority order (HF_TOKEN first, then
 * HF_TOKEN_2, ...), so callers can fail over from one account's exhausted
 * free quota to the next automatically.
 */
function getAllTokens() {
  return [process.env.HF_TOKEN, process.env.HF_TOKEN_2].filter(Boolean);
}

module.exports = { getClient, getAllTokens };
