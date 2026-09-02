import { NextRequest, NextResponse } from "next/server";
import { generateAssessment } from "@/lib/ai-providers";
import { officialAssessmentTemplateSections } from "@/lib/official-assessment-template";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";
import { incrementAssessmentCount } from "@/lib/stats";
import type { SourceDoc, AssessmentResult } from "@/lib/types";

export const maxDuration = 300;

interface GenerateAssessmentBody {
  notebookId?: string;
  instructions?: string;
  modelId?: string;
  assessmentType?: string;
  numberOfItems?: string;
  itemTypes?: string[];
  difficultyLevel?: string;
  timeLimit?: string;
  totalPoints?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as GenerateAssessmentBody;
    if (!body.notebookId) {
      return NextResponse.json({ error: "notebookId is required." }, { status: 400 });
    }

    const notebook = await getNotebook(body.notebookId);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }

    const instructions = body.instructions?.trim().slice(0, 4000) || undefined;
    const standards = notebook.details?.competency?.trim() || undefined;
    const learnerContext = notebook.details?.learnerContext?.trim() || undefined;
    const topic = notebook.details?.contentStandard?.trim() || undefined;

    if (!standards) {
      return NextResponse.json(
        { error: "Set the Learning Competency & Curriculum Standards in Lesson details first." },
        { status: 400 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        { error: "Set the Content / Topic in Lesson details first." },
        { status: 400 }
      );
    }

    const sources: SourceDoc[] = notebook.sources;
    const assessmentSections = officialAssessmentTemplateSections();

    const now = new Date().toISOString();

    const { sections } = await generateAssessment({
      sources,
      sections: assessmentSections,
      instructions,
      standards,
      learnerContext,
      topic,
      assessmentType: body.assessmentType,
      numberOfItems: body.numberOfItems,
      itemTypes: body.itemTypes,
      difficultyLevel: body.difficultyLevel,
      timeLimit: body.timeLimit,
      totalPoints: body.totalPoints,
      modelId: body.modelId,
    });

    const assessmentResult: AssessmentResult = {
      generatedAt: now,
      instructions,
      details: {
        assessmentType: body.assessmentType as "formative" | "summative" | "diagnostic" | "performance",
        numberOfItems: body.numberOfItems,
        itemTypes: body.itemTypes,
        difficultyLevel: body.difficultyLevel,
        timeLimit: body.timeLimit,
        totalPoints: body.totalPoints,
      },
      sections,
    };

    notebook.assessmentResult = assessmentResult;
    await saveNotebook(notebook);
    incrementAssessmentCount(); // fire-and-forget, best-effort

    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
