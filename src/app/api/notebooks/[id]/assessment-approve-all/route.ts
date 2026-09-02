import { NextRequest, NextResponse } from "next/server";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }

    if (!notebook.assessmentResult) {
      return NextResponse.json({ error: "No assessment generated yet." }, { status: 400 });
    }

    const now = new Date().toISOString();
    for (const section of notebook.assessmentResult.sections) {
      if (!section.approvedAt) {
        section.approvedAt = now;
      }
    }

    await saveNotebook(notebook);
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
