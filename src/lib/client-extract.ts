import type { SourceKind } from "./types";

const MAX_SOURCE_CHARS = 400_000;
const MIN_TEXT_CHARS = 40;

export interface ClientExtracted {
  name: string;
  kind: SourceKind;
  text: string;
}

function detectKind(name: string): SourceKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return null;
}

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

/** Extract plain text from a PDF or DOCX file, entirely in the browser. */
export async function extractText(file: File): Promise<ClientExtracted> {
  const kind = detectKind(file.name);
  if (!kind) {
    throw new Error(
      `"${file.name}": unsupported type. Only PDF and DOCX files are supported.`
    );
  }
  let text = "";
  try {
    text = kind === "pdf" ? await extractPdf(file) : await extractDocx(file);
  } catch {
    throw new Error(`"${file.name}": could not read this file.`);
  }
  text = text.trim();
  if (text.length < MIN_TEXT_CHARS) {
    throw new Error(
      `"${file.name}": no readable text found. Scanned or image-only files are not supported.`
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
