import "dotenv/config";

/**
 * Central configuration for the Vantivo server.
 *
 * The server is the ONLY place that holds the WaveSpeed API key.
 * All upstream wavespeed.ai routes are read from environment variables
 * (with safe defaults) so they can be swapped without touching code.
 */

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

export const config = {
  port: Number(env("PORT", "8787")),

  // ---- Secret (server only) -------------------------------------------------
  apiKey: env("WAVESPEED_API_KEY", ""),

  // ---- WaveSpeed base routes ------------------------------------------------
  baseUrl: env("WAVESPEED_BASE_URL", "https://api.wavespeed.ai"),
  llmBaseUrl: env("WAVESPEED_LLM_BASE_URL", "https://llm.wavespeed.ai/v1"),

  // ---- Chat + vision (cheap mini, multimodal: reads photos) -----------------
  chatUrl: env(
    "WAVESPEED_CHAT_URL",
    "https://llm.wavespeed.ai/v1/chat/completions",
  ),
  chatModel: env("WAVESPEED_CHAT_MODEL", "openai/gpt-4o-mini"),
  visionModel: env("WAVESPEED_VISION_MODEL", "openai/gpt-4o-mini"),

  // ---- Image generation (1K) — low + medium quality presets -----------------
  imageGenerateLowUrl: env(
    "WAVESPEED_IMAGE_GENERATE_LOW_URL",
    "https://api.wavespeed.ai/api/v3/wavespeed-ai/z-image/turbo",
  ),
  imageGenerateMediumUrl: env(
    "WAVESPEED_IMAGE_GENERATE_MEDIUM_URL",
    "https://api.wavespeed.ai/api/v3/google/nano-banana-pro",
  ),

  // ---- Image editing (1K) — low + medium quality presets --------------------
  imageEditLowUrl: env(
    "WAVESPEED_IMAGE_EDIT_LOW_URL",
    "https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit",
  ),
  imageEditMediumUrl: env(
    "WAVESPEED_IMAGE_EDIT_MEDIUM_URL",
    "https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit",
  ),

  // ---- Predictions polling endpoint -----------------------------------------
  // Result is fetched at: `${predictionsUrl}/${id}/result`
  predictionsUrl: env(
    "WAVESPEED_PREDICTIONS_URL",
    "https://api.wavespeed.ai/api/v3/predictions",
  ),

  // ---- Image defaults -------------------------------------------------------
  // WaveSpeed image models commonly accept a "WIDTH*HEIGHT" size string.
  imageSize1k: env("WAVESPEED_IMAGE_SIZE_1K", "1024*1024"),

  // Polling tuning
  pollIntervalMs: Number(env("WAVESPEED_POLL_INTERVAL_MS", "1200")),
  pollTimeoutMs: Number(env("WAVESPEED_POLL_TIMEOUT_MS", "120000")),
} as const;

export type Quality = "low" | "medium";

export function imageGenerateUrl(quality: Quality): string {
  return quality === "medium"
    ? config.imageGenerateMediumUrl
    : config.imageGenerateLowUrl;
}

export function imageEditUrl(quality: Quality): string {
  return quality === "medium"
    ? config.imageEditMediumUrl
    : config.imageEditLowUrl;
}
