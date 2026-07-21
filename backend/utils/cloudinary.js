const axios = require("axios");

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "o6kkyswq";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "Kera_Assets";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Uploads a base64 data URL (as returned by the image model) to Cloudinary
 * using an unsigned upload preset - no API key/secret needed. The preset
 * ("Kera_Assets") already controls the destination folder (Kera/assets),
 * naming and overwrite behaviour on Cloudinary's side.
 *
 * We do this so MongoDB only ever stores a short CDN URL for image
 * messages instead of a multi-MB base64 blob (which is also what caused
 * chat history to blow past the text model's token limit before).
 */
async function uploadImage(dataUrl) {
  const { data } = await axios.post(
    UPLOAD_URL,
    new URLSearchParams({
      file: dataUrl,
      upload_preset: UPLOAD_PRESET,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  if (!data?.secure_url) {
    throw new Error("Cloudinary upload did not return a URL.");
  }
  return data.secure_url;
}

module.exports = { uploadImage };
