import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config, type Quality } from "./config.js";
import {
  chatCompletion,
  editImage,
  generateImage,
  WaveSpeedError,
  type ChatMessage,
} from "./wavespeed.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const VANTIVO_SYSTEM_PROMPT = `You are Vantivo, a fast, friendly and extremely capable assistant that helps people get things done instantly. 
You can chat, reason, write and structure documents, explain photos the user shares, and you work hand-in-hand with image generation and editing tools. 
Be concise, warm and practical. Answer in the same language the user writes in (Portuguese or English). 
When asked to create a document/PDF, return clean, well-structured Markdown (titles, sections, bullet points) so it can be exported nicely.`;

function asQuality(value: unknown): Quality {
  return value === "medium" ? "medium" : "low";
}

// --- Health ------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "vantivo-server",
    hasApiKey: Boolean(config.apiKey),
    chatModel: config.chatModel,
    time: new Date().toISOString(),
  });
});

// --- Chat (text) -------------------------------------------------------------
app.post("/api/chat", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incoming: ChatMessage[] = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];
    const messages: ChatMessage[] = [
      { role: "system", content: VANTIVO_SYSTEM_PROMPT },
      ...incoming,
    ];
    const result = await chatCompletion({
      messages,
      model: req.body?.model,
      temperature: req.body?.temperature,
      maxTokens: req.body?.maxTokens,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- Vision (read a photo + question) ---------------------------------------
app.post("/api/vision", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prompt: string =
      req.body?.prompt || "Describe this image in detail. What do you see?";
    const imageUrl: string | undefined = req.body?.imageUrl || req.body?.image;
    const history: ChatMessage[] = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];

    if (!imageUrl) {
      throw new WaveSpeedError("vision requires an 'imageUrl' (or 'image')", 400);
    }

    const messages: ChatMessage[] = [
      { role: "system", content: VANTIVO_SYSTEM_PROMPT },
      ...history,
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ];

    const result = await chatCompletion({
      messages,
      model: req.body?.model || config.visionModel,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- Image generation --------------------------------------------------------
app.post(
  "/api/image/generate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prompt: string = (req.body?.prompt || "").toString().trim();
      if (!prompt) {
        throw new WaveSpeedError("image generation requires a 'prompt'", 400);
      }
      const result = await generateImage({
        prompt,
        quality: asQuality(req.body?.quality),
        size: req.body?.size,
      });
      res.json({ images: result.outputs });
    } catch (err) {
      next(err);
    }
  },
);

// --- Image editing -----------------------------------------------------------
app.post(
  "/api/image/edit",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prompt: string = (req.body?.prompt || "").toString().trim();
      const images: string[] = Array.isArray(req.body?.images)
        ? req.body.images
        : req.body?.image
          ? [req.body.image]
          : [];
      if (!prompt) {
        throw new WaveSpeedError("image editing requires a 'prompt'", 400);
      }
      if (images.length === 0) {
        throw new WaveSpeedError(
          "image editing requires at least one image ('images' or 'image')",
          400,
        );
      }
      const result = await editImage({
        prompt,
        images,
        quality: asQuality(req.body?.quality),
        size: req.body?.size,
      });
      res.json({ images: result.outputs });
    } catch (err) {
      next(err);
    }
  },
);

// --- Error handler -----------------------------------------------------------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof WaveSpeedError) {
    res.status(err.status).json({ error: err.message, detail: err.detail });
    return;
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("[vantivo-server]", err);
  res.status(500).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`\nVantivo server listening on http://localhost:${config.port}`);
  console.log(`  chat model:   ${config.chatModel}`);
  console.log(`  api key set:  ${config.apiKey ? "yes" : "NO (set WAVESPEED_API_KEY)"}\n`);
});
