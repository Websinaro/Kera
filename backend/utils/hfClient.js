const { InferenceClient } = require("@huggingface/inference");

let client = null;

/**
 * The official HF SDK auto-routes each request to whichever partner
 * provider (Together, fal.ai, Novita, Fireworks, etc.) actually serves the
 * requested model, and speaks each provider's exact request/response shape
 * for us - which hand-rolled REST calls to a hardcoded provider can't do
 * reliably, since providers come and go and their APIs aren't standardized
 * (especially for image generation).
 */
function getClient() {
  if (!process.env.HF_TOKEN) {
    throw new Error("HF_TOKEN is not set. Add your Hugging Face access token to the environment.");
  }
  if (!client) {
    client = new InferenceClient(process.env.HF_TOKEN);
  }
  return client;
}

module.exports = { getClient };
