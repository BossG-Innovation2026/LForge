import { NextRequest, NextResponse } from "next/server";
import { buildLessonDocx, safeFileName } from "@/lib/export-docx";
import { getNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { notebookId?: string };
    if (!body.notebookId) {
      return NextResponse.json({ error: "notebookId is required." }, { status: 400 });
    }
    const notebook = await getNotebook(body.notebookId);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    if (!notebook.result) {
      return NextResponse.json(
        { error: "Generate a lesson plan before exporting." },
        { status: 400 }
      );
    }

    const buffer = await buildLessonDocx(notebook);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeFileName(notebook.title)}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
