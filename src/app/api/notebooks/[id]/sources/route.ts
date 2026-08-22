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

interface IncomingSource {
  name?: unknown;
  kind?: unknown;
  text?: unknown;
}

/**
 * Add sources by plain text extracted client-side in the browser.
 * Body: { sources: [{ name, kind: "pdf" | "docx", text }] }
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
      const name =
        typeof item.name === "string" && item.name.trim()
          ? item.name.trim().slice(0, 255)
          : "Untitled file";
      const text = typeof item.text === "string" ? item.text : "";

      if (
        item.kind !== "pdf" &&
        item.kind !== "docx"
      ) {
        errors.push(`${name}: unsupported file type.`);
        continue;
      }
      if (text.trim().length < MIN_TEXT_CHARS) {
        errors.push(
          `${name}: no readable text found. Scanned or image-only files are not supported.`
        );
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

    notebook.sources.push(...added);
    await saveNotebook(notebook);

    return NextResponse.json({
      notebook,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return jsonError(error);
  }
}
