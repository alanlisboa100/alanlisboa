/**
 * Routes & config for the Vantivo app.
 *
 * Convention: every route is read from a process.env.EXPO_PUBLIC_* variable
 * with a safe local fallback. URLs are NEVER hardcoded elsewhere in the app,
 * and API keys never live in the app (the server holds them).
 *
 * IMPORTANT: Expo inlines EXPO_PUBLIC_* vars only when referenced *statically*
 * (e.g. `process.env.EXPO_PUBLIC_API_URL`). Dynamic access like
 * `process.env[name]` is NOT replaced, so every variable below is read
 * explicitly.
 */

const DEFAULT_BASE = "http://localhost:8787";

function pick(value: string | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function pickInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(pick(value, String(fallback)), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const apiUrl = pick(process.env.EXPO_PUBLIC_API_URL, DEFAULT_BASE);

export const ENV = {
  apiUrl,
  serverUrl: pick(process.env.EXPO_PUBLIC_SERVER_URL, apiUrl),
  healthUrl: pick(process.env.EXPO_PUBLIC_HEALTH_URL, `${apiUrl}/health`),

  chatUrl: pick(process.env.EXPO_PUBLIC_CHAT_URL, `${apiUrl}/api/chat`),
  visionUrl: pick(process.env.EXPO_PUBLIC_VISION_URL, `${apiUrl}/api/vision`),
  imageGenerateUrl: pick(
    process.env.EXPO_PUBLIC_IMAGE_GENERATE_URL,
    `${apiUrl}/api/image/generate`,
  ),
  imageEditUrl: pick(
    process.env.EXPO_PUBLIC_IMAGE_EDIT_URL,
    `${apiUrl}/api/image/edit`,
  ),
  pdfReadUrl: pick(process.env.EXPO_PUBLIC_PDF_READ_URL, `${apiUrl}/api/pdf/read`),
  pdfMergeUrl: pick(
    process.env.EXPO_PUBLIC_PDF_MERGE_URL,
    `${apiUrl}/api/pdf/merge`,
  ),

  maxTabs: Math.min(pickInt(process.env.EXPO_PUBLIC_VANTIVO_MAX_TABS, 10), 10),
  chatModel: pick(process.env.EXPO_PUBLIC_CHAT_MODEL, "openai/gpt-4o-mini"),
  defaultQuality: (pick(process.env.EXPO_PUBLIC_IMAGE_QUALITY_DEFAULT, "low") ===
  "medium"
    ? "medium"
    : "low") as "low" | "medium",
} as const;
