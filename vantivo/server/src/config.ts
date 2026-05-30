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
  // "Econômico" default; the app can request the "Forte" model per message.
  chatModel: env("WAVESPEED_CHAT_MODEL", "openai/gpt-4o-mini"),
  visionModel: env("WAVESPEED_VISION_MODEL", "openai/gpt-4o-mini"),

  // ---- Images: GPT Image 2 (generate) + Seedream V4 (edit) ------------------
  // GPT Image 2 has native quality tiers (low / medium / high) for generation.
  // Seedream V4 Edit is a strong, affordable editor (outperforms Nano Banana).
  imageGenerateUrl: env(
    "WAVESPEED_IMAGE_GENERATE_URL",
    "https://api.wavespeed.ai/api/v3/openai/gpt-image-2/text-to-image",
  ),
  imageEditUrl: env(
    "WAVESPEED_IMAGE_EDIT_URL",
    "https://api.wavespeed.ai/api/v3/bytedance/seedream-v4/edit",
  ),

  // ---- Predictions polling endpoint -----------------------------------------
  // Result is fetched at: `${predictionsUrl}/${id}/result`
  predictionsUrl: env(
    "WAVESPEED_PREDICTIONS_URL",
    "https://api.wavespeed.ai/api/v3/predictions",
  ),

  // ---- Image defaults -------------------------------------------------------
  // GPT Image 2 (OpenAI) uses an "WIDTHxHEIGHT" size string.
  imageSize1k: env("WAVESPEED_IMAGE_SIZE_1K", "1024x1024"),

  // Polling tuning
  pollIntervalMs: Number(env("WAVESPEED_POLL_INTERVAL_MS", "1200")),
  pollTimeoutMs: Number(env("WAVESPEED_POLL_TIMEOUT_MS", "120000")),
} as const;

export type Quality = "low" | "medium";
