import { NextRequest, NextResponse } from "next/server";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    if (!notebook.result) {
      return NextResponse.json({ error: "Generate a lesson plan first." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as {
      sectionId?: unknown;
      sessionIndex?: unknown;
    } | null;

    const sectionId = typeof body?.sectionId === "string" ? body.sectionId : "";
    const sessionIndex = typeof body?.sessionIndex === "number" ? body.sessionIndex : -1;

    const now = new Date().toISOString();

    if (sessionIndex >= 0 && notebook.result.sessionPlans && notebook.result.sessionPlans[sessionIndex]) {
      // Multi-session: toggle approval in the session plan
      const sp = notebook.result.sessionPlans[sessionIndex];
      const section = sp.sections.find((s) => s.sectionId === sectionId);
      if (!section) {
        return NextResponse.json({ error: "Section not found." }, { status: 400 });
      }
      if (section.approvedAt) {
        delete section.approvedAt;
      } else {
        section.approvedAt = now;
      }
    } else {
      // Single session
      const section = notebook.result.sections.find((s) => s.sectionId === sectionId);
      if (!section) {
        return NextResponse.json({ error: "Section not found." }, { status: 400 });
      }
      if (section.approvedAt) {
        delete section.approvedAt;
      } else {
        section.approvedAt = now;
      }
    }

    notebook.updatedAt = now;
    await saveNotebook(notebook);
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
