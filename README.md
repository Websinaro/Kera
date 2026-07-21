# Kera Chat

A ChatGPT-style chat app, built so it can run comfortably on a **free-tier server**. The model
is never loaded into the backend's own process — every generation call goes to **Hugging Face's
Inference Providers API** (serverless, routed to a partner provider), so a small free instance
(Render, Railway, Fly.io free tier, etc.) never has to hold model weights in RAM and never
crashes from it.

By default this points at `Qwen/Qwen2.5-7B-Instruct` for chat and `black-forest-labs/FLUX.1-schnell`
for images — both widely mirrored across free-tier providers. **Before deploying, always check
your chosen model's HF page for an "Inference Providers" section that shows it's actually
served** — models (and which providers host them) change over time, and some providers (like the
legacy `hf-inference`) now only serve a narrow set of small/CPU-friendly models. Swap models any
time via `HF_MODEL` / `HF_IMAGE_MODEL` — no code changes needed.

## Features

- 🔐 Email/password signup & login (JWT auth, bcrypt password hashing)
- 💬 ChatGPT-style layout: sidebar with chat history, each chat keeps its own message memory
- 🧠 Per-chat **custom instructions** (system prompt) editable from the UI
- ⏱️ Usage limits per user: **25 messages / 30 minutes**, inside a rolling **2‑hour session**
  that starts on the user's first message (shown live in the UI)
- 🎨 **AI image generation** — type `/image <description>` in any chat to generate a high-quality
  image inline, with download and copy-image buttons. Images are stored on **Cloudinary**, not
  as raw base64 in MongoDB.
- 📎 **Image upload + editing** — attach a photo and Kera remembers it for that chat ("image-based
  memory"); every `/image` command after that edits the uploaded photo instead of starting from
  scratch, until you clear it.
- 🔁 **Two-tier free fallback for chat** — tries your first Hugging Face account, then a second
  HF account (`HF_TOKEN_2`) if the first's free monthly quota runs out, then falls back to the
  Gemini free API as a last resort. Image generation stays HF-only (Gemini is text-only here).
- 👑 **Unlimited admin accounts** — emails listed in `ADMIN_EMAILS` (default `websinaro@gmail.com`)
  skip all rate limits entirely
- 📋 Copy button on every message, and on every code block inside a message
- 👍👎 Like / dislike on assistant replies
- 🔗 Shareable, **read-only** chat links that **expire after 2 hours**
- ✨ Clean emoji use, markdown formatting and consistent spacing enforced via the system prompt
- 🤖 Consistent "Kera by WEBSINARO" persona baked into the system prompt
- 🖼️ No user-uploaded image/file processing (only outbound image *generation*), as requested

## Architecture

```
kera-chat/
├── backend/     Express + Mongoose API, JWT auth, HF Inference API client
└── frontend/    React (Vite) + Tailwind, single-page chat UI
```

The backend uses Hugging Face's official `@huggingface/inference` SDK, which auto-routes each
request (chat or image) to whichever partner provider actually hosts the requested model, and
speaks that provider's exact request format for us — no local model weights, no GPU/CPU load on
your server.

## 1. Prerequisites

- Node.js 18+
- A MongoDB database (the free **MongoDB Atlas** tier works well)
- A **Cloudinary** account (free tier is fine) with an **unsigned** upload preset named
  `Kera_Assets` — asset folder `Kera/assets`, type `upload`, overwrite/unique-filename/use-filename
  all `false`. This project's cloud name defaults to `o6kkyswq`; change `CLOUDINARY_CLOUD_NAME`
  if you're using your own account.
- A Hugging Face account + **access token** with Inference Providers permissions
  (create one at https://huggingface.co/settings/tokens)
- Before deploying, open your chosen model's page on huggingface.co (logged in, on any device)
  and check the **"Inference Providers"** panel actually shows it being served — if it says
  "This model isn't deployed by any Inference Provider," the free routed API won't work for it
  and you'd need a paid Inference Endpoint instead (a different setup, not covered by this SDK path).

## 2. Local setup

```bash
# Backend
cd backend
cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET, HF_TOKEN
npm install
npm run dev                # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173 (proxies /api to :5000)
```

## 3. Environment variables (backend/.env)

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default 5000) |
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign auth tokens |
| `JWT_EXPIRES_IN` | Login session length, e.g. `7d` |
| `HF_TOKEN` | **Required.** Your primary Hugging Face access token |
| `HF_TOKEN_2` | Optional second HF account's token, used if the first's free quota is exhausted |
| `HF_MODEL` | Chat model id, e.g. `Qwen/Qwen2.5-7B-Instruct` — must be listed under "Inference Providers" on its HF page |
| `HF_CHAT_PROVIDER` | Optional: pin a specific provider instead of auto-routing |
| `GEMINI_API_KEY` | Optional last-resort chat fallback if both HF tokens fail (text only) |
| `GEMINI_MODEL` | Gemini model id, default `gemini-2.0-flash` |
| `HF_IMAGE_MODEL` | Image model id, default `black-forest-labs/FLUX.1-schnell` |
| `HF_IMAGE_EDIT_MODEL` | Image-editing model, default `black-forest-labs/FLUX.1-Kontext-dev`, used once a chat has an uploaded reference image |
| `HF_IMAGE_PROVIDER` | Optional: pin a specific image provider instead of auto-routing |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name, default `o6kkyswq` |
| `CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset name, default `Kera_Assets` |
| `ADMIN_EMAILS` | Comma-separated emails that bypass all rate limits, default `websinaro@gmail.com` |
| `SESSION_LIMIT_MINUTES` | Length of a usage session (default `120` = 2h) |
| `WINDOW_LIMIT_MESSAGES` | Messages allowed per window (default `25`) |
| `WINDOW_LIMIT_MINUTES` | Window length (default `30`) |
| `SHARE_LINK_TTL_HOURS` | How long share links stay valid (default `2`) |
| `CLIENT_ORIGIN` | Your deployed frontend URL, for CORS |

## 4. Building for production

The backend serves the built frontend directly, so you can deploy this as **one single free
web service**:

```bash
cd frontend
npm install
npm run build          # outputs frontend/dist

cd ../backend
npm install
npm start               # serves the API + frontend/dist together
```

### Deploying on a free instance (e.g. Render)

1. Push this repo to GitHub.
2. Create a new **Web Service** on Render (or similar), root directory = repo root.
3. Build command:
   ```
   cd frontend && npm install && npm run build && cd ../backend && npm install
   ```
4. Start command:
   ```
   node backend/server.js
   ```
5. Add all the environment variables from the table above (as real Render env vars — **never
   commit your `.env` file**).
6. Because inference happens on Hugging Face's servers, the free instance only needs to run a
   lightweight Express + MongoDB client process — well within free-tier RAM limits.

## 5. How the rate limit works

- A user's **session** starts the moment they send their very first message and lasts
  `SESSION_LIMIT_MINUTES` (default 2 hours). After it lapses, a new session simply starts on
  their next message — it's a rolling quota, not a permanent lockout.
- Inside an active session, at most `WINDOW_LIMIT_MESSAGES` (default 25) messages are allowed
  per rolling `WINDOW_LIMIT_MINUTES` (default 30). The usage bar in the UI shows the live
  countdown for both.
- Any account whose email is listed in `ADMIN_EMAILS` skips this entirely — no session, no
  window, no cap. The UI shows "⚡ Unlimited access — admin account" instead of the quota bar.

## 6. Chat fallback chain & image memory

Every chat message tries, in order: **HF_TOKEN → HF_TOKEN_2 → Gemini**. This means a single free
account running out of its monthly HF quota doesn't take the app down — it just quietly moves to
the next option. Image generation only uses HF (both tokens, no Gemini), since Gemini isn't used
for images here.

Uploading an image (the 📎 button) uploads it to Cloudinary and stores the URL on the chat as
`referenceImageUrl` — from then on, `/image <prompt>` in that chat edits the uploaded image
(via `HF_IMAGE_EDIT_MODEL`) instead of generating a new one from scratch. Clear it anytime with
the "✕ Clear" chip above the input, or by uploading a new image to replace it.

## 7. Notes on the model

`backend/utils/hfInference.js` calls HF's OpenAI-compatible chat completions router, so the
provider applies the model's own chat template server-side — you don't need to hand-build
prompt tags. A style guide (clean spacing, restrained emoji use, fenced code blocks) is injected
as the system message alongside each chat's own custom instructions.

To switch models, just change `HF_MODEL` — but always verify on the model's HF page first that
it's actually listed under "Inference Providers," or requests will fail.

## 8. What's intentionally out of scope

- No general vision Q&A — Kera can't "see" or describe arbitrary details of an uploaded/generated
  image beyond the prompt it was given; uploads are used for image *editing* memory, not visual
  understanding.
- No admin dashboard / billing — this is a lean, single-tier free deployment.
