import { NextRequest, NextResponse } from "next/server";
import { getNotebook, newId, saveNotebook } from "@/lib/store";
import type { SourceDoc, SourceKind } from "@/lib/types";
import { jsonError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

const MAX_SOURCE_CHARS = 400_000;
const MIN_TEXT_CHARS = 40;
const MAX_FILES_PER_REQUEST = 20;
const MAX_TOTAL_SOURCES = 20;
const MAX_IMAGES_PER_NOTEBOOK = 10;
const MAX_IMAGE_DATAURL_CHARS = 900_000; // ~650KB binary

const TEXT_KINDS: SourceKind[] = ["pdf", "docx", "pptx"];

interface IncomingSource {
  name?: unknown;
  kind?: unknown;
  text?: unknown;
  dataUrl?: unknown;
}

/**
 * Add sources prepared in the browser.
 * Body: { sources: [{ name, kind: "pdf"|"docx"|"pptx"|"image", text?, dataUrl? }] }
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as {
      sources?: IncomingSource[];
    } | null;
    const incoming = Array.isArray(body?.sources) ? body!.sources! : [];
    if (incoming.length === 0) {
      return NextResponse.json({ error: "No sources were provided." }, { status: 400 });
    }

    const added: SourceDoc[] = [];
    const errors: string[] = [];
    for (const item of incoming.slice(0, MAX_FILES_PER_REQUEST)) {
      if (notebook.sources.length + added.length >= MAX_TOTAL_SOURCES) {
        errors.push(`Source limit reached (${MAX_TOTAL_SOURCES} per lesson plan).`);
        break;
      }
      const name =
        typeof item.name === "string" && item.name.trim()
          ? item.name.trim().slice(0, 255)
          : "Untitled file";

      if (item.kind === "image") {
        const dataUrl =
          typeof item.dataUrl === "string" ? item.dataUrl : "";
        if (!/^data:image\/(jpeg|png);base64,/.test(dataUrl)) {
          errors.push(`${name}: image could not be processed.`);
          continue;
        }
        if (dataUrl.length > MAX_IMAGE_DATAURL_CHARS) {
          errors.push(`${name}: image is too large after compression.`);
          continue;
        }
        const imageCount =
          notebook.sources.filter((s) => s.kind === "image").length +
          added.filter((s) => s.kind === "image").length;
        if (imageCount >= MAX_IMAGES_PER_NOTEBOOK) {
          errors.push(`Image limit reached (${MAX_IMAGES_PER_NOTEBOOK}).`);
          continue;
        }
        added.push({
          id: newId(),
          name,
          kind: "image",
          text: "",
          chars: 0,
          addedAt: new Date().toISOString(),
          dataUrl,
        });
        continue;
      }

      if (!TEXT_KINDS.includes(item.kind as SourceKind)) {
        errors.push(
          `${item.kind === "web" ? name : name}: use the Add link option for web pages.`
        );
        continue;
      }
      const text = typeof item.text === "string" ? item.text : "";
      if (text.trim().length < MIN_TEXT_CHARS) {
        errors.push(`${name}: no readable text found in this file.`);
        continue;
      }
      added.push({
        id: newId(),
        name,
        kind: item.kind as SourceKind,
        text:
          text.length > MAX_SOURCE_CHARS
            ? `${text.slice(0, MAX_SOURCE_CHARS)}\n[text truncated]`
            : text,
        chars: Math.min(text.length, MAX_SOURCE_CHARS),
        addedAt: new Date().toISOString(),
      });
    }

    if (added.length > 0) {
      notebook.sources.push(...added);
      await saveNotebook(notebook);
    }

    return NextResponse.json({
      notebook,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return jsonError(error);
  }
}
