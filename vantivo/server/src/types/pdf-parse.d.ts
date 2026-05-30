// Minimal typings for the direct lib entry of pdf-parse.
// We import "pdf-parse/lib/pdf-parse.js" instead of "pdf-parse" to avoid the
// package's debug branch (which tries to read a bundled test PDF on import).
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  }
  function pdfParse(
    data: Buffer | Uint8Array,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>;
  export default pdfParse;
}
