import { NextRequest, NextResponse } from "next/server";
import { getNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";
import {
  fillOfficialDocx,
  notebookToFillFieldsForSession,
  TAGGED_TEMPLATE_PATH,
} from "@/lib/docx-fill";
import { buildZip } from "@/lib/docx-zip";

function safeBase(title: string): string {
  return title.replace(/[^\w\d- ]+/g, "").trim().replace(/\s+/g, "-") || "lesson-plan";
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
      return NextResponse.json({ error: "Generate a lesson plan before exporting." }, { status: 400 });
    }
    if (!notebook.template) {
      return NextResponse.json({ error: "Lesson format is unavailable." }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const templateUrl = `${origin}${TAGGED_TEMPLATE_PATH}`;
    const sessionPlans = notebook.result.sessionPlans;
    const isMulti = sessionPlans && sessionPlans.length > 1;

    if (isMulti) {
      // Validate all sessions fully approved
      for (let i = 0; i < sessionPlans.length; i++) {
        const sp = sessionPlans[i];
        const unapproved = sp.sections.filter((s) => !s.approvedAt && s.content.trim());
        if (unapproved.length > 0) {
          return NextResponse.json(
            { error: `Session ${sp.sessionNumber} still has ${unapproved.length} unapproved section(s).` },
            { status: 400 }
          );
        }
      }

      // Generate one DOCX per session
      const base = safeBase(notebook.title);
      const zipEntries: Array<{ name: string; data: Uint8Array }> = [];
      for (let i = 0; i < sessionPlans.length; i++) {
        const fields = notebookToFillFieldsForSession(notebook, i);
        const bytes = await fillOfficialDocx(templateUrl, fields);
        zipEntries.push({ name: `${base}-Session-${i + 1}.docx`, data: bytes });
      }

      const zipBytes = await buildZip(zipEntries);
      return new NextResponse(zipBytes, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${base}.zip"`,
        },
      });
    }

    // Single session — original behavior
    const competencySet = Boolean(notebook.details?.competency?.trim());
    const approvedIds = new Set(
      notebook.result.sections.filter((s) => s.approvedAt).map((s) => s.sectionId)
    );
    const missing = notebook.template.sections.filter(
      (t) => !approvedIds.has(t.id) && !(competencySet && t.id === "sec-1")
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Approve all sections before exporting. ${missing.length} still pending.` },
        { status: 400 }
      );
    }

    const fields = notebookToFillFieldsForSession(notebook, 0);
    const bytes = await fillOfficialDocx(templateUrl, fields);
    const base = safeBase(notebook.title);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${base}.docx"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
