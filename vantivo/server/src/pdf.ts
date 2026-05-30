import { PDFDocument } from "pdf-lib";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

/** Accepts a raw base64 string or a `data:...;base64,XXX` data URI. */
function toBuffer(input: string): Buffer {
  const base64 = input.includes(",") ? input.split(",").pop() ?? "" : input;
  return Buffer.from(base64, "base64");
}

export interface ExtractedPdf {
  text: string;
  pages: number;
  truncated: boolean;
  title?: string;
}

/** Extract plain text from a PDF, truncating very large documents. */
export async function extractPdfText(
  input: string,
  maxChars = 14000,
): Promise<ExtractedPdf> {
  const buffer = toBuffer(input);
  const data = await pdfParse(buffer);
  const full = (data.text || "").replace(/\n{3,}/g, "\n\n").trim();
  const truncated = full.length > maxChars;
  const info = (data.info || {}) as Record<string, unknown>;
  return {
    text: truncated ? full.slice(0, maxChars) : full,
    pages: data.numpages,
    truncated,
    title: typeof info.Title === "string" ? info.Title : undefined,
  };
}

/** Merge several PDFs (base64 / data URIs) into one, returned as base64. */
export async function mergePdfs(inputs: string[]): Promise<string> {
  const merged = await PDFDocument.create();
  for (const input of inputs) {
    const src = await PDFDocument.load(toBuffer(input));
    const copied = await merged.copyPages(src, src.getPageIndices());
    copied.forEach((page) => merged.addPage(page));
  }
  const bytes = await merged.save();
  return Buffer.from(bytes).toString("base64");
}
