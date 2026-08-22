import { NextRequest, NextResponse } from "next/server";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Toggle approval for one generated section. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    if (!notebook.result) {
      return NextResponse.json(
        { error: "Generate a lesson plan first." },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      sectionId?: unknown;
    } | null;
    const sectionId = typeof body?.sectionId === "string" ? body.sectionId : "";
    const section = notebook.result.sections.find((s) => s.sectionId === sectionId);
    if (!section) {
      return NextResponse.json({ error: "Section not found." }, { status: 400 });
    }

    if (section.approvedAt) {
      delete section.approvedAt;
    } else {
      section.approvedAt = new Date().toISOString();
    }
    notebook.updatedAt = new Date().toISOString();
    await saveNotebook(notebook);

    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
