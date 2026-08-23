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

    const body = (await request.json().catch(() => ({}))) as { sessionIndex?: unknown };
    const sessionIndex = typeof body?.sessionIndex === "number" ? body.sessionIndex : -1;

    const now = new Date().toISOString();
    let changed = 0;

    if (sessionIndex >= 0 && notebook.result.sessionPlans && notebook.result.sessionPlans[sessionIndex]) {
      // Approve all sections in the specified session only
      for (const section of notebook.result.sessionPlans[sessionIndex].sections) {
        if (!section.approvedAt && section.content.trim()) {
          section.approvedAt = now;
          changed++;
        }
      }
    } else {
      // Single session — approve all
      for (const section of notebook.result.sections) {
        if (!section.approvedAt && section.content.trim()) {
          section.approvedAt = now;
          changed++;
        }
      }
    }

    notebook.updatedAt = now;
    await saveNotebook(notebook);
    return NextResponse.json({ notebook, approved: changed });
  } catch (error) {
    return jsonError(error);
  }
}
