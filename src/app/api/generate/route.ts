import { NextRequest, NextResponse } from "next/server";
import { generateFullPlan, generateSingleSection, generateMultiSession, parseSessionCount } from "@/lib/ai-providers";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";
import { searchWeb, searchResultsToSourceDocs } from "@/lib/web-search";
import type { SourceDoc } from "@/lib/types";

export const maxDuration = 300;

const COMPETENCY_SECTION_ID = "sec-1";
const COMPETENCY_FALLBACK_TITLE = "Learning Competency and Curriculum Standards";

interface GenerateBody {
  notebookId?: string;
  sectionId?: string;
  instructions?: string;
  feedback?: string;
  modelId?: string;
}

async function fetchWebSources(topic: string, standards: string): Promise<SourceDoc[]> {
  const parts = [
    standards && `"${standards.slice(0, 120)}"`,
    topic && `"${topic.slice(0, 120)}"`,
    "DepEd Philippines SHS curriculum",
  ].filter(Boolean);
  const query = parts.join(" ").slice(0, 200);
  const results = await searchWeb(query, 5);
  const now = new Date().toISOString();
  return searchResultsToSourceDocs(results).map((s, i) => ({
    id: `web-search-${i}`,
    chars: s.text.length,
    addedAt: now,
    ...s,
  }));
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
      return NextResponse.json({ error: "Upload a lesson template first." }, { status: 400 });
    }

    const instructions = body.instructions?.trim().slice(0, 4000) || undefined;
    const standards = notebook.details?.competency?.trim() || undefined;
    const learnerContext = notebook.details?.learnerContext?.trim() || undefined;
    const topic = notebook.details?.contentStandard?.trim() || undefined;
    const sessionCount = parseSessionCount(notebook.details?.sessions);

    let sources: SourceDoc[] = notebook.sources;
    if (sources.length === 0 && (topic || standards)) {
      const webSources = await fetchWebSources(topic ?? "", standards ?? "");
      if (webSources.length > 0) {
        sources = webSources;
        notebook.sources = webSources;
      }
    }

    // Single section regeneration
    if (body.sectionId) {
      if (body.sectionId === COMPETENCY_SECTION_ID) {
        return NextResponse.json(
          { error: "The Learning Competency is set by you in Lesson details and cannot be regenerated." },
          { status: 400 }
        );
      }
      if (!standards) {
        return NextResponse.json(
          { error: "Set the Learning Competency & Curriculum Standards in Lesson details first." },
          { status: 400 }
        );
      }

      const previous = notebook.result?.sections.find((s) => s.sectionId === body.sectionId) ?? null;

      const section = await generateSingleSection({
        sources,
        sections: notebook.template.sections,
        targetSectionId: body.sectionId,
        instructions,
        feedback: body.feedback?.trim().slice(0, 2000),
        previousContent: previous?.content,
        standards,
        learnerContext,
        topic,
        modelId: body.modelId,
      });

      if (!notebook.result) {
        notebook.result = { generatedAt: new Date().toISOString(), sections: [section] };
      } else {
        const idx = notebook.result.sections.findIndex((s) => s.sectionId === section.sectionId);
        if (idx >= 0) {
          notebook.result.sections[idx] = section;
        } else {
          notebook.result.sections.push(section);
        }
      }
      await saveNotebook(notebook);
      return NextResponse.json({ notebook });
    }

    // Full generation
    if (!standards) {
      return NextResponse.json(
        { error: "Set the Learning Competency & Curriculum Standards in Lesson details first. They anchor every other section." },
        { status: 400 }
      );
    }

    const competencyTitle =
      notebook.template.sections.find((s) => s.id === COMPETENCY_SECTION_ID)?.title ??
      COMPETENCY_FALLBACK_TITLE;

    const now = new Date().toISOString();
    const competencySection = {
      sectionId: COMPETENCY_SECTION_ID,
      title: competencyTitle,
      content: standards,
      sourceRefs: [],
      approvedAt: now,
    };

    if (sessionCount > 1) {
      // Multi-session generation
      const sessionPlans = await generateMultiSession({
        sources,
        sections: notebook.template.sections,
        standards,
        sessionCount,
        competencySectionId: COMPETENCY_SECTION_ID,
        instructions,
        learnerContext,
        topic,
        modelId: body.modelId,
      });

      // Flatten first session sections as the primary result for backward compat
      notebook.result = {
        generatedAt: now,
        instructions,
        sections: [competencySection, ...sessionPlans[0].sections],
        sessionPlans,
      };
    } else {
      // Single session
      const generatable = notebook.template.sections.filter((s) => s.id !== COMPETENCY_SECTION_ID);
      const sections = await generateFullPlan({
        sources,
        sections: generatable,
        instructions,
        standards,
        learnerContext,
        topic,
        modelId: body.modelId,
      });

      notebook.result = {
        generatedAt: now,
        instructions,
        sections: [competencySection, ...sections],
      };
    }

    await saveNotebook(notebook);
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
