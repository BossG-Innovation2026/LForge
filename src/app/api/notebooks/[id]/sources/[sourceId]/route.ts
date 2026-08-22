import { NextRequest, NextResponse } from "next/server";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string; sourceId: string }>;
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { id, sourceId } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    const before = notebook.sources.length;
    notebook.sources = notebook.sources.filter((s) => s.id !== sourceId);
    if (notebook.sources.length === before) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }
    // A stale generated plan may reference removed sources.
    notebook.result = null;
    await saveNotebook(notebook);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
