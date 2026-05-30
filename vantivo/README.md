# Vantivo

**Vantivo** is a powerful mobile chat app that does it all *on the spot*: it chats
(cheap & fast), reads photos you send, generates and edits images in 1K, turns
answers into PDFs, and lets you open up to **10 conversation tabs** so each topic
gets its own space.

It is powered by [wavespeed.ai](https://wavespeed.ai) through a small server proxy
that keeps your API key safe (the key is **never** shipped inside the app).

```
vantivo/
├── app/      # Expo (React Native) mobile app
└── server/   # Node + Express proxy to wavespeed.ai (holds the API key)
```

---

## ✨ Features

| Feature | How |
| --- | --- |
| 💬 **Fast chat** | **Eco** = cheap mini (`openai/gpt-4o-mini`) · **Forte** = `openai/gpt-5.4-mini` — toggle in the header |
| 🔎 **Read a photo** | Attach a photo in **Chat** mode → Vantivo describes/answers about it |
| 🖼️ **Create images** | **Image** mode → **GPT Image 2**, 1K **Low** or **Medium** quality |
| ✏️ **Edit images** | Attach a photo + **Edit** mode → **Seedream V4 Edit**, 1K Low/Medium |
| 📄 **Make PDFs** | Export any answer or a whole conversation to a styled PDF |
| 📥 **Read PDFs** | Attach a PDF → Vantivo extracts the text so you can ask, summarize or translate it |
| ✍️ **Edit PDFs** | Summarize / translate / rewrite a PDF, then export the result as a new PDF |
| 🗂️ **Merge PDFs** | Combine several PDFs into one file and share it |
| 🗂️ **Up to 10 tabs** | A separate conversation per subject, auto-named & saved |
| 🧠 **Persistent memory** | Tabs, messages **and a pinned PDF per tab** survive app restarts |
| 📋 **Polish** | Markdown answers, copy, retry, tap-to-zoom images, save to gallery |

Quick tips inside the app:
- Type `/img a neon city at night` (or just "create an image of…") to generate.
- Type `/edit make the sky purple` (with a photo attached) to edit it.
- Tap **＋** to attach a **PDF** (it stays pinned to the tab) or to **merge** PDFs.
- Toggle **Eco / Forte** in the header to switch between cheap and stronger models.
- Long-press a tab to rename it. Use the **＋** in the tab bar to open a new one.

---

## 1) Run the server

The server is the only place that knows your WaveSpeed API key.

```bash
cd vantivo/server
npm install
cp .env.example .env        # then edit .env and set WAVESPEED_API_KEY
npm run dev                 # starts on http://localhost:8787
```

Get a key from the **WaveSpeed dashboard → API Keys**, then set it in
`vantivo/server/.env`:

```env
WAVESPEED_API_KEY=ws_your_real_key_here
```

Check it works:

```bash
curl http://localhost:8787/health
```

### Server routes (all configurable in `server/.env`)

| Purpose | Upstream wavespeed.ai route (default) |
| --- | --- |
| Chat + Vision (Eco) | `https://llm.wavespeed.ai/v1/chat/completions` · `openai/gpt-4o-mini` |
| Chat + Vision (Forte) | same endpoint · `openai/gpt-5.4-mini` |
| Image generate (low/medium) | `…/api/v3/openai/gpt-image-2/text-to-image` (quality in body) |
| Image edit (low/medium) | `…/api/v3/bytedance/seedream-v4/edit` |
| Predictions poll | `…/api/v3/predictions/{id}/result` |

> You can swap any model by editing the matching `WAVESPEED_*_URL` in `server/.env`
> — no code changes needed. Browse models at <https://wavespeed.ai/models>.

The server also exposes two **local** PDF endpoints (no external calls):
`POST /api/pdf/read` (extracts text via `pdf-parse`) and `POST /api/pdf/merge`
(combines PDFs via `pdf-lib`).

---

## 2) Run the app

```bash
cd vantivo/app
npm install
npx expo install          # aligns native deps to your Expo SDK
cp .env.example .env       # routes only — NO keys live in the app
npx expo start
```

Then scan the QR code with **Expo Go** (iOS/Android) or press `a` / `i`.

### Phone on the same Wi‑Fi as your computer

`localhost` from the phone points to the phone itself, so point the app at your
computer's LAN IP in `vantivo/app/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:8787
EXPO_PUBLIC_CHAT_URL=http://192.168.0.10:8787/api/chat
EXPO_PUBLIC_VISION_URL=http://192.168.0.10:8787/api/vision
EXPO_PUBLIC_IMAGE_GENERATE_URL=http://192.168.0.10:8787/api/image/generate
EXPO_PUBLIC_IMAGE_EDIT_URL=http://192.168.0.10:8787/api/image/edit
```

Find your IP with `ipconfig` (Windows) or `ifconfig` / `ipconfig getifaddr en0` (macOS).
Restart `expo start` after editing `.env` (env vars are inlined at build time).

---

## 🔐 Routes & keys convention

- The **app** only stores **routes** via `EXPO_PUBLIC_*` variables (read with safe
  local fallbacks in `app/src/env.ts`). URLs are never hardcoded in the code.
- **API keys never live in the app.** Only the **server** consumes the WaveSpeed
  key (`server/.env`).

---

## 🧱 Tech

- **App:** Expo SDK 52, React Native, TypeScript. UI uses a premium ChatGPT-style
  dark theme with `expo-linear-gradient` accents.
  Modules: AsyncStorage, expo-image-picker, expo-document-picker, expo-file-system,
  expo-print, expo-sharing, expo-clipboard, expo-media-library.
- **Server:** Node 18+, Express, TypeScript (ESM), pdf-parse, pdf-lib.

---

## 🛠️ Troubleshooting

- **"Can't reach the Vantivo server"** → server not running, or
  `EXPO_PUBLIC_API_URL` is `localhost` while testing on a real phone (use LAN IP).
- **`Missing WAVESPEED_API_KEY`** → set it in `server/.env` and restart the server.
- **Image returns nothing / times out** → the chosen model may be busy or the
  route changed; try the other quality, or update the `WAVESPEED_*_URL` in
  `server/.env`. Polling timeout is configurable (`WAVESPEED_POLL_TIMEOUT_MS`).

---

Made with ❤️ — Vantivo, powered by wavespeed.ai.
