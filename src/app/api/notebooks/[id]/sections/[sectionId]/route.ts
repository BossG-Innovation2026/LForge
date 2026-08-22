import { NextRequest, NextResponse } from "next/server";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string; sectionId: string }>;
}

const MAX_CONTENT_CHARS = 20_000;

/** Edit the content of one section (only while it is not approved). */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id, sectionId } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    const section = notebook.result?.sections.find((s) => s.sectionId === sectionId);
    if (!section) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }
    if (section.approvedAt) {
      return NextResponse.json(
        { error: "Un-approve this section before editing it." },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      content?: unknown;
    } | null;
    const content = typeof body?.content === "string" ? body.content : "";
    if (content.length > MAX_CONTENT_CHARS) {
      return NextResponse.json(
        { error: `Section text is too long (max ${MAX_CONTENT_CHARS} characters).` },
        { status: 400 }
      );
    }
    section.content = content.trim();
    notebook.updatedAt = new Date().toISOString();
    await saveNotebook(notebook);

    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
