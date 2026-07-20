# Kera Chat

A ChatGPT-style chat app, built so it can run comfortably on a **free-tier server**. The model
is never loaded into the backend's own process — every generation call goes to **Hugging Face's
Inference Providers API** (serverless, routed to a partner provider), so a small free instance
(Render, Railway, Fly.io free tier, etc.) never has to hold model weights in RAM and never
crashes from it.

By default this points at `google/gemma-2-2b-it`, a small instruct model confirmed available on
HF's free routed inference. **Before deploying, always check your chosen model's HF page for an
"Inference Providers" section that shows it's actually served** — many custom/private models
(including fine-tunes) are *not* automatically hosted there and need a paid Inference Endpoint
instead. Swap models any time via the `HF_MODEL` env var — no code changes needed.

## Features

- 🔐 Email/password signup & login (JWT auth, bcrypt password hashing)
- 💬 ChatGPT-style layout: sidebar with chat history, each chat keeps its own message memory
- 🧠 Per-chat **custom instructions** (system prompt) editable from the UI
- ⏱️ Usage limits per user: **25 messages / 30 minutes**, inside a rolling **2‑hour session**
  that starts on the user's first message (shown live in the UI)
- 🎨 **AI image generation** — type `/image <description>` in any chat to generate a high-quality
  image inline, with download and copy-image buttons
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

The backend calls `https://router.huggingface.co/v1/chat/completions` (HF's OpenAI-compatible
Inference Providers router) with your `HF_TOKEN` and chosen `HF_MODEL` on every message — no
local model weights, no GPU/CPU load on your server. HF auto-selects a partner provider that
actually serves the model and applies its chat template server-side.

## 1. Prerequisites

- Node.js 18+
- A MongoDB database (the free **MongoDB Atlas** tier works well)
- A Hugging Face account + **access token** with Inference Providers permissions
  (create one at https://huggingface.co/settings/tokens)
- Before deploying, open your chosen model's page on huggingface.co (logged in, on any device)
  and check the **"Inference Providers"** panel actually shows it being served — if it says
  "This model isn't deployed by any Inference Provider," the free routed API won't work for it
  and you'd need a paid Inference Endpoint instead (see `HF_INFERENCE_URL` below to point at one).

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
| `HF_TOKEN` | **Required.** Your Hugging Face access token |
| `HF_MODEL` | Model id to use, e.g. `google/gemma-2-2b-it` — must be listed under "Inference Providers" on its HF page |
| `HF_INFERENCE_URL` | Optional override, e.g. a paid Inference Endpoint URL instead of the free router |
| `HF_IMAGE_MODEL` | Image model id, default `black-forest-labs/FLUX.1-schnell` |
| `HF_IMAGE_URL` | Optional override of the image generation endpoint |
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

## 6. Notes on the model

`backend/utils/hfInference.js` calls HF's OpenAI-compatible chat completions router, so the
provider applies the model's own chat template server-side — you don't need to hand-build
prompt tags. A style guide (clean spacing, restrained emoji use, fenced code blocks) is injected
as the system message alongside each chat's own custom instructions.

To switch models, just change `HF_MODEL` — but always verify on the model's HF page first that
it's actually listed under "Inference Providers," or requests will fail.

## 7. What's intentionally out of scope

- No image/file upload or vision processing — text chat only, as requested.
- No admin dashboard / billing — this is a lean, single-tier free deployment.
