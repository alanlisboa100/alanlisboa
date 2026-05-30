import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { ChatMessage, ChatTab } from "./types";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Tiny, dependency-free Markdown -> HTML for clean PDF output. */
function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  const inline = (text: string): string =>
    escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return html.join("\n");
}

function documentHtml(title: string, bodyHtml: string): string {
  const date = new Date().toLocaleString();
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a1a2a; padding: 40px; line-height: 1.55; }
    .brand { color: #7C5CFC; font-weight: 800; letter-spacing: 0.5px; font-size: 13px; text-transform: uppercase; }
    h1.title { font-size: 26px; margin: 4px 0 2px; }
    .meta { color: #8a8a9a; font-size: 12px; margin-bottom: 24px; }
    hr { border: none; border-top: 1px solid #e6e6ee; margin: 18px 0; }
    h1,h2,h3,h4 { color: #2a2150; margin: 18px 0 6px; }
    p { margin: 8px 0; }
    ul { margin: 8px 0 8px 18px; }
    code { background: #f1f1f7; padding: 1px 5px; border-radius: 5px; font-size: 90%; }
    .footer { margin-top: 36px; color: #b0b0c0; font-size: 11px; text-align: center; }
  </style></head>
  <body>
    <div class="brand">Vantivo</div>
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="meta">Generated ${escapeHtml(date)}</div>
    <hr />
    ${bodyHtml}
    <div class="footer">Created with Vantivo • powered by wavespeed.ai</div>
  </body></html>`;
}

async function printAndShare(html: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share your Vantivo PDF",
      UTI: "com.adobe.pdf",
    });
  }
}

/** Export a single assistant message to PDF. */
export async function exportMessageToPdf(message: ChatMessage): Promise<void> {
  const body = markdownToHtml(message.text || "");
  await printAndShare(documentHtml("Vantivo Document", body));
}

/** Export an entire conversation tab to PDF. */
export async function exportThreadToPdf(tab: ChatTab): Promise<void> {
  const parts: string[] = [];
  for (const m of tab.messages) {
    if (m.pending) continue;
    const who = m.role === "user" ? "You" : "Vantivo";
    parts.push(`<h3>${who}</h3>`);
    if (m.text) parts.push(markdownToHtml(m.text));
    if (m.imageUrls?.length) {
      for (const url of m.imageUrls) {
        parts.push(
          `<p><img src="${escapeHtml(url)}" style="max-width:100%;border-radius:10px;" /></p>`,
        );
      }
    }
    parts.push("<hr />");
  }
  await printAndShare(documentHtml(tab.title || "Vantivo Chat", parts.join("\n")));
}
