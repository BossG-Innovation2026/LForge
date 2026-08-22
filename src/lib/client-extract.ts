import type { SourceKind } from "./types";

const MAX_SOURCE_CHARS = 400_000;
const MIN_TEXT_CHARS = 40;
/** Server cap: MAX_IMAGE_DATAURL_CHARS in the sources API. */
const MAX_IMAGE_DATAURL_CHARS = 900_000;
const IMAGE_MAX_EDGE = 1280;

export const SOURCE_ACCEPT =
  ".pdf,.docx,.pptx,.txt,.html,.htm,.jpg,.jpeg,.png," +
  "application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
  "text/plain,text/html,image/jpeg,image/png";

export interface ClientExtracted {
  name: string;
  kind: SourceKind;
  text?: string;
  dataUrl?: string;
}

function detectKind(name: string): SourceKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pptx")) return "pptx";
  if (lower.endsWith(".txt") || lower.endsWith(".text")) return "txt";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image";
  if (lower.endsWith(".png")) return "image";
  return null;
}

/* ---------------- text extraction ---------------- */

async function extractPdf(file: File): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function extractDocx(file: File): Promise<string> {
  const mammothModule = await import("mammoth/mammoth.browser");
  const mammoth = mammothModule.default ?? mammothModule;
  const { value } = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return value;
}

async function extractTxt(file: File): Promise<string> {
  return file.text();
}

const HTML_SKIP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "svg",
  "template",
  "head",
]);

function collectHtmlText(node: Node, out: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    out.push(node.nodeValue ?? "");
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (HTML_SKIP_TAGS.has(el.tagName.toLowerCase())) return;
  const block = el.tagName === "BR";
  if (block) out.push("\n");
  for (const child of Array.from(el.childNodes)) collectHtmlText(child, out);
  if (/^(P|DIV|H[1-6]|LI|TR|SECTION|ARTICLE|HEADER|FOOTER|BLOCKQUOTE|PRE|TABLE)$/.test(el.tagName)) {
    out.push("\n");
  }
}

async function extractHtml(file: File): Promise<string> {
  const raw = await file.text();
  const doc = new DOMParser().parseFromString(raw, "text/html");
  const parts: string[] = [];
  collectHtmlText(doc.body, parts);
  return parts
    .join("")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/* ---------------- pptx extraction ---------------- */

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

function slideXmlToLines(xml: string): string[] {
  const lines: string[] = [];
  const paraRe = /<a:p\b[\s\S]*?<\/a:p>/g;
  for (const para of xml.match(paraRe) ?? []) {
    const runs = [...para.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) =>
      decodeXmlEntities(m[1])
    );
    const line = runs.join("").trim();
    if (line) lines.push(line);
  }
  return lines;
}

interface SlideEntry {
  num: number;
  data: Uint8Array;
}

function numberedEntries(
  entries: { name: string; data: Uint8Array }[],
  dir: string,
  filePattern: RegExp
): SlideEntry[] {
  const out: SlideEntry[] = [];
  for (const e of entries) {
    if (!e.name.startsWith(dir)) continue;
    const base = e.name.slice(dir.length);
    const m = base.match(filePattern);
    if (!m) continue;
    const nested = base.slice(m[0].length);
    if (nested && !nested.startsWith("_rels") && nested.includes("/")) continue;
    out.push({ num: Number(m[1]), data: e.data });
  }
  return out.sort((a, b) => a.num - b.num);
}

async function extractPptx(file: File): Promise<string> {
  const { readZip } = await import("./docx-zip");
  let entries;
  try {
    entries = await readZip(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error(`"${file.name}": not a readable PowerPoint file.`);
  }

  const slides = numberedEntries(entries, "ppt/slides/", /^slide(\d+)\.xml$/);
  if (slides.length === 0) {
    throw new Error(`"${file.name}": no slides found.`);
  }
  const notes = new Map<number, Uint8Array>();
  for (const n of numberedEntries(entries, "ppt/notesSlides/", /^notesSlide(\d+)\.xml$/)) {
    notes.set(n.num, n.data);
  }

  const decoder = new TextDecoder();
  const blocks: string[] = [];
  slides.forEach((slide, i) => {
    const lines = slideXmlToLines(decoder.decode(slide.data));
    const notesLines = notes.has(slide.num)
      ? slideXmlToLines(decoder.decode(notes.get(slide.num)!))
      : [];
    const parts: string[] = [`=== Slide ${i + 1} ===`];
    if (lines.length > 0) parts.push(...lines);
    if (notesLines.length > 0) parts.push(`[Speaker notes] ${notesLines.join(" ")}`);
    if (parts.length > 1) blocks.push(parts.join("\n"));
  });

  return blocks.join("\n\n");
}

/* ---------------- image compression ---------------- */

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<string> {
  // Small-enough PNG/JPEG files pass through untouched.
  const direct = await readAsDataUrl(file);
  if (
    (file.type === "image/png" || file.type === "image/jpeg") &&
    direct.length <= MAX_IMAGE_DATAURL_CHARS
  ) {
    return direct;
  }

  const bitmap = await createImageBitmap(file);
  try {
    let edge = IMAGE_MAX_EDGE;
    let quality = 0.82;
    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_IMAGE_DATAURL_CHARS) return dataUrl;
      edge = Math.round(edge * 0.75);
      quality = Math.max(0.5, quality - 0.08);
    }
    throw new Error("compress failed");
  } finally {
    bitmap.close();
  }
}

/* ---------------- entry point ---------------- */

/** Extract text or image data from an uploaded reference file, in the browser. */
export async function extractText(file: File): Promise<ClientExtracted> {
  const kind = detectKind(file.name);
  if (!kind) {
    throw new Error(
      `"${file.name}": unsupported type. Allowed: PDF, DOCX, PPTX, TXT, HTML, JPG, PNG.`
    );
  }

  if (kind === "image") {
    let dataUrl: string;
    try {
      dataUrl = await compressImage(file);
    } catch {
      throw new Error(`"${file.name}": could not process this image.`);
    }
    return { name: file.name, kind, dataUrl };
  }

  let text = "";
  try {
    text =
      kind === "pdf"
        ? await extractPdf(file)
        : kind === "docx"
          ? await extractDocx(file)
          : kind === "pptx"
            ? await extractPptx(file)
            : kind === "html"
              ? await extractHtml(file)
              : await extractTxt(file);
  } catch (err) {
    throw err instanceof Error ? err : new Error(`"${file.name}": could not read this file.`);
  }
  text = text.trim();
  if (text.length < MIN_TEXT_CHARS) {
    throw new Error(
      `"${file.name}": no readable text found (scanned files are not supported).`
    );
  }
  let truncated = false;
  if (text.length > MAX_SOURCE_CHARS) {
    text = text.slice(0, MAX_SOURCE_CHARS);
    truncated = true;
  }
  return {
    name: file.name,
    kind,
    text: truncated ? `${text}\n[text truncated]` : text,
  };
}
