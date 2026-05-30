import { ENV } from "./env";
import type { Quality } from "./types";

/** OpenAI-style message we send to the chat route. */
export interface ApiChatMessage {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_TIMEOUT = 130_000;

async function postJson<T>(
  url: string,
  body: unknown,
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const msg = data?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data as T;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("The request took too long. Please try again.");
    }
    if (err?.message?.includes("Network request failed")) {
      throw new Error(
        "Can't reach the Vantivo server. Is it running, and is EXPO_PUBLIC_API_URL pointing to the right address?",
      );
    }
    throw err;
  }
}

export const api = {
  async chat(messages: ApiChatMessage[], model?: string): Promise<string> {
    const data = await postJson<{ content: string }>(ENV.chatUrl, {
      messages,
      model: model || ENV.chatModel,
    });
    return data.content?.trim() || "(empty response)";
  },

  async vision(
    prompt: string,
    imageDataUri: string,
    history: ApiChatMessage[] = [],
    model?: string,
  ): Promise<string> {
    const data = await postJson<{ content: string }>(ENV.visionUrl, {
      prompt,
      imageUrl: imageDataUri,
      messages: history,
      model,
    });
    return data.content?.trim() || "(empty response)";
  },

  async generateImage(prompt: string, quality: Quality): Promise<string[]> {
    const data = await postJson<{ images: string[] }>(ENV.imageGenerateUrl, {
      prompt,
      quality,
    });
    return data.images || [];
  },

  async editImage(
    prompt: string,
    imageDataUri: string,
    quality: Quality,
  ): Promise<string[]> {
    const data = await postJson<{ images: string[] }>(ENV.imageEditUrl, {
      prompt,
      images: [imageDataUri],
      quality,
    });
    return data.images || [];
  },

  async readPdf(
    base64: string,
  ): Promise<{ text: string; pages: number; truncated: boolean; title?: string }> {
    return postJson(ENV.pdfReadUrl, { base64 });
  },

  async mergePdfs(files: string[]): Promise<string> {
    const data = await postJson<{ pdf: string }>(ENV.pdfMergeUrl, { files });
    return data.pdf;
  },
};
