import { NextRequest, NextResponse } from "next/server";
import { generateFullPlan, generateSingleSection } from "@/lib/gemini";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";

export const maxDuration = 300;

/** The Learning Competency section is authored by the teacher, never the AI. */
const COMPETENCY_SECTION_ID = "sec-1";
const COMPETENCY_FALLBACK_TITLE = "Learning Competency and Curriculum Standards";

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
    const standards = notebook.details?.competency?.trim() || undefined;
    if (notebook.sources.length === 0) {
      return NextResponse.json(
        {
          error:
            "Add at least one source - grounded generation needs reference material.",
        },
        { status: 400 }
      );
    }

    if (body.sectionId) {
      // Regenerate a single section.
      if (body.sectionId === COMPETENCY_SECTION_ID) {
        return NextResponse.json(
          {
            error:
              "The Learning Competency is set by you in Lesson details and cannot be regenerated.",
          },
          { status: 400 }
        );
      }
      if (!standards) {
        return NextResponse.json(
          {
            error:
              "Set the Learning Competency & Curriculum Standards in Lesson details first.",
          },
          { status: 400 }
        );
      }

      const previous =
        notebook.result?.sections.find((s) => s.sectionId === body.sectionId) ?? null;

      const section = await generateSingleSection({
        sources: notebook.sources,
        sections: notebook.template.sections,
        targetSectionId: body.sectionId,
        instructions,
        feedback: body.feedback?.trim().slice(0, 2000),
        previousContent: previous?.content,
        standards,
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
    if (!standards) {
      return NextResponse.json(
        {
          error:
            "Set the Learning Competency & Curriculum Standards in Lesson details first. They anchor every other section.",
        },
        { status: 400 }
      );
    }

    const competencyTitle =
      notebook.template.sections.find((s) => s.id === COMPETENCY_SECTION_ID)?.title ??
      COMPETENCY_FALLBACK_TITLE;
    const generatable = notebook.template.sections.filter(
      (s) => s.id !== COMPETENCY_SECTION_ID
    );

    const sections = await generateFullPlan({
      sources: notebook.sources,
      sections: generatable,
      instructions,
      standards,
    });

    const now = new Date().toISOString();
    notebook.result = {
      generatedAt: now,
      instructions,
      sections: [
        {
          sectionId: COMPETENCY_SECTION_ID,
          title: competencyTitle,
          content: standards,
          sourceRefs: [],
          approvedAt: now,
        },
        ...sections,
      ],
    };
    await saveNotebook(notebook);
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
