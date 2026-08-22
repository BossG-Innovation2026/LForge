import { NextRequest, NextResponse } from "next/server";
import { parseTemplateStructure } from "@/lib/gemini";
import { getNotebook, saveNotebook } from "@/lib/store";
import type { TemplateSection } from "@/lib/types";
import { jsonError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

export const maxDuration = 120;

function sanitizeSections(input: unknown): TemplateSection[] {
  if (!Array.isArray(input)) return [];
  const sections: TemplateSection[] = [];
  let n = 0;
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const record = item as { title?: unknown; guidance?: unknown };
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!title) continue;
    n += 1;
    sections.push({
      id: `sec-${n}`,
      title: title.slice(0, 200),
      guidance:
        typeof record.guidance === "string" ? record.guidance.trim().slice(0, 2000) : "",
    });
    if (sections.length >= 30) break;
  }
  return sections;
}

/** Register a template by its client-extracted text and auto-detect the structure. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as {
      fileName?: unknown;
      text?: unknown;
    } | null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const fileName =
      typeof body?.fileName === "string" && body.fileName.trim()
        ? body.fileName.trim().slice(0, 255)
        : "template";

    if (text.length < 40) {
      return NextResponse.json(
        {
          error:
            "The template file has no readable text. Scanned or image-only files are not supported.",
        },
        { status: 400 }
      );
    }

    const sections = await parseTemplateStructure(text.slice(0, 60_000), fileName);

    notebook.template = {
      fileName,
      sections,
    };
    notebook.result = null;
    await saveNotebook(notebook);

    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}

/** Save manual edits to the template structure. */
export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      sections?: unknown;
    };
    const sections = sanitizeSections(body.sections);
    if (sections.length === 0) {
      return NextResponse.json(
        { error: "A template needs at least one section with a title." },
        { status: 400 }
      );
    }

    notebook.template = {
      fileName: body.title?.trim() || notebook.template?.fileName || "Custom template",
      sections,
    };
    notebook.result = null;
    await saveNotebook(notebook);

    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}

/** Remove the template. */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    notebook.template = null;
    notebook.result = null;
    await saveNotebook(notebook);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
