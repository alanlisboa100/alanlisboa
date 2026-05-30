import { config, type Quality } from "./config.js";

/** Minimal shape of an OpenAI-style chat message. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

export class WaveSpeedError extends Error {
  constructor(
    message: string,
    public status = 502,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "WaveSpeedError";
  }
}

function authHeaders(): Record<string, string> {
  if (!config.apiKey) {
    throw new WaveSpeedError(
      "Missing WAVESPEED_API_KEY on the server. Set it in vantivo/server/.env",
      500,
    );
  }
  return {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

/**
 * Chat completion (also used for vision when a message contains image_url
 * parts). Talks to the OpenAI-compatible WaveSpeed LLM endpoint.
 */
export async function chatCompletion(opts: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string; model: string; usage?: unknown }> {
  const model = opts.model || config.chatModel;
  const res = await fetch(config.chatUrl, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1500,
      stream: false,
    }),
  });

  const data = await readJson(res);
  if (!res.ok) {
    throw new WaveSpeedError(
      `Chat request failed (${res.status})`,
      res.status,
      data,
    );
  }

  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    "";

  return { content, model, usage: data?.usage };
}

/**
 * Submit a prediction job and poll until it completes, returning output URLs.
 * Used by both image generation and image editing.
 */
async function runPrediction(
  url: string,
  body: Record<string, unknown>,
): Promise<{ outputs: string[]; raw: unknown }> {
  const submit = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const submitted = await readJson(submit);
  if (!submit.ok) {
    throw new WaveSpeedError(
      `Prediction submit failed (${submit.status})`,
      submit.status,
      submitted,
    );
  }

  // The submit response may already contain outputs, or just an id to poll.
  const data = submitted?.data ?? submitted;
  const predictionId: string | undefined = data?.id ?? data?.prediction_id;

  const immediateOutputs = extractOutputs(data);
  if (immediateOutputs.length > 0 && isDone(data?.status)) {
    return { outputs: immediateOutputs, raw: submitted };
  }

  if (!predictionId) {
    // No id and no outputs — surface whatever we got back.
    if (immediateOutputs.length > 0) {
      return { outputs: immediateOutputs, raw: submitted };
    }
    throw new WaveSpeedError(
      "Prediction response did not include an id or outputs",
      502,
      submitted,
    );
  }

  const deadline = Date.now() + config.pollTimeoutMs;
  while (Date.now() < deadline) {
    await sleep(config.pollIntervalMs);
    const pollUrl = `${config.predictionsUrl}/${predictionId}/result`;
    const pollRes = await fetch(pollUrl, { headers: authHeaders() });
    const pollData = await readJson(pollRes);
    if (!pollRes.ok) {
      throw new WaveSpeedError(
        `Prediction poll failed (${pollRes.status})`,
        pollRes.status,
        pollData,
      );
    }

    const d = pollData?.data ?? pollData;
    const status: string = d?.status ?? "";
    if (isDone(status)) {
      const outputs = extractOutputs(d);
      if (outputs.length === 0) {
        throw new WaveSpeedError(
          "Prediction completed but returned no outputs",
          502,
          pollData,
        );
      }
      return { outputs, raw: pollData };
    }
    if (isFailed(status)) {
      throw new WaveSpeedError(
        `Prediction ${status}: ${d?.error ?? "unknown error"}`,
        502,
        pollData,
      );
    }
  }

  throw new WaveSpeedError("Prediction timed out", 504);
}

export async function generateImage(opts: {
  prompt: string;
  quality: Quality;
  size?: string;
}): Promise<{ outputs: string[]; raw: unknown }> {
  return runPrediction(config.imageGenerateUrl, {
    prompt: opts.prompt,
    quality: opts.quality,
    size: opts.size || config.imageSize1k,
    enable_base64_output: false,
  });
}

export async function editImage(opts: {
  prompt: string;
  images: string[]; // URLs or data URIs
  quality: Quality;
  size?: string;
}): Promise<{ outputs: string[]; raw: unknown }> {
  return runPrediction(config.imageEditUrl, {
    prompt: opts.prompt,
    images: opts.images,
    quality: opts.quality,
    size: opts.size || config.imageSize1k,
    enable_base64_output: false,
  });
}

// ---- helpers ----------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDone(status?: string): boolean {
  return ["completed", "succeeded", "success"].includes(
    (status || "").toLowerCase(),
  );
}

function isFailed(status?: string): boolean {
  return ["failed", "error", "canceled", "cancelled"].includes(
    (status || "").toLowerCase(),
  );
}

/** Pull image URLs out of the many shapes WaveSpeed responses can take. */
function extractOutputs(data: any): string[] {
  if (!data) return [];
  const candidates = [
    data.outputs,
    data.output,
    data.images,
    data.urls,
    data.result?.outputs,
    data.data?.outputs,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      return c
        .map((item) =>
          typeof item === "string" ? item : item?.url ?? item?.image ?? "",
        )
        .filter((s): s is string => typeof s === "string" && s.length > 0);
    }
    if (typeof c === "string" && c.length > 0) return [c];
  }
  return [];
}
