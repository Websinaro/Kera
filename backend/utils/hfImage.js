const axios = require("axios");
const { getClient, getAllTokens } = require("./hfClient");

// FLUX.2-dev: Black Forest Labs' newer, higher-quality model. It's the one
// Hugging Face's own docs use as the reference example for BOTH
// text-to-image and image-to-image, and it's mapped across multiple
// providers (fal-ai, replicate, wavespeed) for image-to-image specifically -
// unlike FLUX.1-Kontext-dev, which some providers only expose as
// text-to-image (causing "Task 'image-to-image' not supported" errors).
// Always verify on the model's HF page ("Inference Providers" panel) before
// relying on a different one.
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.2-dev";
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
