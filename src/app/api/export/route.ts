import { NextRequest, NextResponse } from "next/server";
import { getNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";
import {
  fillOfficialDocx,
  notebookToFillFields,
  TAGGED_TEMPLATE_PATH,
} from "@/lib/docx-fill";

function safeFileName(title: string): string {
  const base = title.replace(/[^\w\d- ]+/g, "").trim().replace(/\s+/g, "-");
  return `${base || "lesson-plan"}.docx`;
}

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
    if (!notebook.template) {
      return NextResponse.json(
        { error: "Upload a template before exporting." },
        { status: 400 }
      );
    }

    const approvedIds = new Set(
      notebook.result.sections
        .filter((s) => s.approvedAt)
        .map((s) => s.sectionId)
    );
    const missing = notebook.template.sections.filter((t) => !approvedIds.has(t.id));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Approve all sections before exporting. ${missing.length} of ${notebook.template.sections.length} still pending.`,
        },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;
    const bytes = await fillOfficialDocx(
      `${origin}${TAGGED_TEMPLATE_PATH}`,
      notebookToFillFields(notebook)
    );

    return new NextResponse(new Uint8Array(bytes), {
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
