import { NextRequest, NextResponse } from "next/server";
import { generateFullPlan, generateSingleSection } from "@/lib/gemini";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

export const maxDuration = 300;

interface GenerateBody {
  notebookId?: string;
  sectionId?: string;
  instructions?: string;
  feedback?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as GenerateBody;
    if (!body.notebookId) {
      return NextResponse.json({ error: "notebookId is required." }, { status: 400 });
    }

    const notebook = await getNotebook(body.notebookId);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    if (!notebook.template || notebook.template.sections.length === 0) {
      return NextResponse.json(
        { error: "Upload a lesson template first." },
        { status: 400 }
      );
    }

    const instructions = body.instructions?.trim().slice(0, 4000) || undefined;

    if (body.sectionId) {
      // Regenerate a single section.
      const previous =
        notebook.result?.sections.find((s) => s.sectionId === body.sectionId) ?? null;

      const section = await generateSingleSection({
        sources: notebook.sources,
        sections: notebook.template.sections,
        targetSectionId: body.sectionId,
        instructions,
        feedback: body.feedback?.trim().slice(0, 2000),
        previousContent: previous?.content,
      });

      if (!notebook.result) {
        notebook.result = {
          generatedAt: new Date().toISOString(),
          sections: [section],
        };
      } else {
        const idx = notebook.result.sections.findIndex(
          (s) => s.sectionId === section.sectionId
        );
        if (idx >= 0) {
          notebook.result.sections[idx] = section;
        } else {
          notebook.result.sections.push(section);
        }
      }
      await saveNotebook(notebook);
      return NextResponse.json({ notebook });
    }

    // Full generation.
    const sections = await generateFullPlan({
      sources: notebook.sources,
      sections: notebook.template.sections,
      instructions,
    });

    notebook.result = {
      generatedAt: new Date().toISOString(),
      instructions,
      sections,
    };
    await saveNotebook(notebook);
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
