import { NextRequest, NextResponse } from "next/server";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

export const maxDuration = 30;

interface SectionBody {
  content?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { id, sectionId } = await params;
    const body = (await request.json().catch(() => ({}))) as SectionBody;
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "content is required." }, { status: 400 });
    }

    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }

    if (!notebook.assessmentResult) {
      return NextResponse.json({ error: "No assessment generated yet." }, { status: 400 });
    }

    const section = notebook.assessmentResult.sections.find(
      (s) => s.sectionId === sectionId
    );
    if (!section) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    section.content = body.content.trim();
    // Remove approval when editing
    section.approvedAt = undefined;

    await saveNotebook(notebook);
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
