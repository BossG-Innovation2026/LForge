import { NextRequest, NextResponse } from "next/server";
import { deleteNotebook, getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    if (typeof body.title === "string" && body.title.trim()) {
      notebook.title = body.title.trim().slice(0, 200);
      await saveNotebook(notebook);
    }
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const deleted = await deleteNotebook(id);
    if (!deleted) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
