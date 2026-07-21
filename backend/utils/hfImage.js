const axios = require("axios");
const { getClient, getAllTokens } = require("./hfClient");

// IMPORTANT: a single model ID can support different tasks on different
// providers (e.g. FLUX.2-dev is image-to-image-only on fal-ai but works
// fine for text-to-image on other providers) - trying to reuse one model
// id for both tasks is what caused the flip-flopping "task not supported"
// errors. So generation and editing intentionally use DIFFERENT models,
// each one Hugging Face's own docs confirm for that specific task:
//   - text-to-image  -> FLUX.1-dev   (HF's reference example for generation)
//   - image-to-image -> FLUX.2-dev   (HF's reference example for editing)
// Always verify on the model's HF page ("Inference Providers" panel) before
// relying on a different one.
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-dev";
// Image editing (used when the chat has an uploaded reference image).
const HF_IMAGE_EDIT_MODEL = process.env.HF_IMAGE_EDIT_MODEL || "black-forest-labs/FLUX.2-dev";
// Optional: pin a specific provider (e.g. "fal-ai", "replicate", "together").
// Leave unset to let Hugging Face auto-pick whichever provider is live.
const HF_IMAGE_PROVIDER = process.env.HF_IMAGE_PROVIDER || undefined;

function blobToDataUrl(buffer, contentType) {
  return `data:${contentType || "image/png"};base64,${buffer.toString("base64")}`;
}

/**
 * Generates an image from a text prompt (no reference image). Tries each
 * configured HF token in turn before giving up - Gemini is never used for
 * images, only for chat.
 */
async function generateImage(prompt) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Please describe what you'd like the image to look like.");
  }

  const errors = [];
  for (const token of getAllTokens()) {
    try {
      const client = getClient(token);
      const blob = await client.textToImage({
        model: HF_IMAGE_MODEL,
        provider: HF_IMAGE_PROVIDER,
        inputs: prompt.trim(),
      });
      const buffer = Buffer.from(await blob.arrayBuffer());
      return blobToDataUrl(buffer, blob.type);
    } catch (err) {
      errors.push(err.message);
    }
  }

  throw new Error(errors.join(" | ") || "No Hugging Face token configured.");
}

/**
 * Edits/regenerates an existing image (from a URL, e.g. one the user
 * uploaded or a prior Cloudinary result) guided by a text prompt -
 * "image-based memory": once a chat has a reference image, /image edits it
 * instead of starting from scratch, until the reference is cleared.
 */
async function generateImageEdit(prompt, referenceImageUrl) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Please describe how you'd like the image changed.");
  }

  const { data: refBuffer } = await axios.get(referenceImageUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  const errors = [];
  for (const token of getAllTokens()) {
    try {
      const client = getClient(token);
      const blob = await client.imageToImage({
        model: HF_IMAGE_EDIT_MODEL,
        provider: HF_IMAGE_PROVIDER,
        inputs: new Blob([refBuffer]),
        parameters: { prompt: prompt.trim() },
      });
      const buffer = Buffer.from(await blob.arrayBuffer());
      return blobToDataUrl(buffer, blob.type);
    } catch (err) {
      errors.push(err.message);
    }
  }

  throw new Error(errors.join(" | ") || "No Hugging Face token configured.");
}

module.exports = { generateImage, generateImageEdit };
