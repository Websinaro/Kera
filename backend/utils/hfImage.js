const axios = require("axios");

// HF's routed Inference Providers API, hitting the "hf-inference" first
// party provider directly for text-to-image. Like chat, the image model is
// never generated on this server - it runs on HF's infrastructure.
const HF_IMAGE_URL =
  process.env.HF_IMAGE_URL || "https://router.huggingface.co/hf-inference/models/" +
    (process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell");

/**
 * Generates an image from a text prompt and returns it as a base64 data URL
 * ready to drop straight into an <img src="..."> tag.
 */
async function generateImage(prompt, { retries = 3 } = {}) {
  if (!process.env.HF_TOKEN) {
    throw new Error("HF_TOKEN is not set. Add your Hugging Face access token to the environment.");
  }
  if (!prompt || !prompt.trim()) {
    throw new Error("Please describe what you'd like the image to look like.");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        HF_IMAGE_URL,
        {
          inputs: prompt.trim(),
          options: {
            // Let the provider cold-start the model on demand instead of
            // failing immediately - same "serverless" behaviour as chat.
            wait_for_model: true,
            use_cache: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "image/png",
          },
          responseType: "arraybuffer",
          timeout: 90000,
        }
      );

      const contentType = response.headers["content-type"] || "image/png";
      if (!contentType.startsWith("image/")) {
        // Some providers return JSON errors with a 200 status.
        const text = Buffer.from(response.data).toString("utf-8");
        throw new Error(JSON.parse(text)?.error || "Image provider returned an unexpected response.");
      }

      const base64 = Buffer.from(response.data).toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch (err) {
      const status = err.response?.status;
      const estimatedTime = err.response?.data ? tryParseEstimatedTime(err.response.data) : null;

      if (status === 503 && attempt < retries) {
        const wait = Math.min(Math.ceil((estimatedTime || 5) * 1000), 20000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if ((status === 429 || !status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }

      const message = extractErrorMessage(err);
      throw new Error(message);
    }
  }
}

function tryParseEstimatedTime(data) {
  try {
    const text = Buffer.isBuffer(data) ? data.toString("utf-8") : JSON.stringify(data);
    return JSON.parse(text)?.estimated_time || null;
  } catch {
    return null;
  }
}

function extractErrorMessage(err) {
  try {
    if (err.response?.data) {
      const text = Buffer.isBuffer(err.response.data)
        ? err.response.data.toString("utf-8")
        : JSON.stringify(err.response.data);
      const parsed = JSON.parse(text);
      return parsed?.error || parsed?.message || err.message;
    }
  } catch {
    // fall through
  }
  return err.message || "Image generation request failed.";
}

module.exports = { generateImage };
