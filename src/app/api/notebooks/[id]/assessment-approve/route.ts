import { NextRequest, NextResponse } from "next/server";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

export const maxDuration = 30;

interface ApproveBody {
  sectionId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as ApproveBody;
    if (!body.sectionId) {
      return NextResponse.json({ error: "sectionId is required." }, { status: 400 });
    }

    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }

    if (!notebook.assessmentResult) {
      return NextResponse.json({ error: "No assessment generated yet." }, { status: 400 });
    }

    const section = notebook.assessmentResult.sections.find(
      (s) => s.sectionId === body.sectionId
    );
    if (!section) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    // Toggle approval
    if (section.approvedAt) {
      section.approvedAt = undefined;
    } else {
      section.approvedAt = new Date().toISOString();
    }

    await saveNotebook(notebook);
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
