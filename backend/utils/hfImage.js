const { getClient } = require("./hfClient");

// FLUX.1-schnell: fast, high quality, widely mirrored across free-tier
// image providers. Always verify on the model's HF page ("Inference
// Providers" panel) before relying on a different one.
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
// Optional: pin a specific provider (e.g. "fal-ai", "replicate", "together").
// Leave unset to let Hugging Face auto-pick whichever provider is live.
const HF_IMAGE_PROVIDER = process.env.HF_IMAGE_PROVIDER || undefined;

/**
 * Generates an image from a text prompt and returns it as a base64 data URL
 * ready to drop straight into an <img src="..."> tag. Runs entirely on the
 * provider's infrastructure - nothing is generated on this server.
 */
async function generateImage(prompt, { retries = 3 } = {}) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Please describe what you'd like the image to look like.");
  }

  const client = getClient();

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const blob = await client.textToImage({
        model: HF_IMAGE_MODEL,
        provider: HF_IMAGE_PROVIDER,
        inputs: prompt.trim(),
      });

      const buffer = Buffer.from(await blob.arrayBuffer());
      const contentType = blob.type || "image/png";
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
    }
  }

  throw new Error(lastErr?.message || "Image generation request failed.");
}

module.exports = { generateImage };
