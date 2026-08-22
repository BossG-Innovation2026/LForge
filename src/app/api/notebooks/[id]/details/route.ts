import { NextRequest, NextResponse } from "next/server";
import { getNotebook, saveNotebook } from "@/lib/store";
import type { NotebookDetails } from "@/lib/types";
import { jsonError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

const MAX_FIELD = 2000;
const MAX_DECLARATION = 4000;

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : "";
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const details: NotebookDetails = {
      competency: clean(body.competency, MAX_FIELD),
      learningArea: clean(body.learningArea, MAX_FIELD),
      teachers: clean(body.teachers, MAX_FIELD),
      gradeSection: clean(body.gradeSection, MAX_FIELD),
      sessions: clean(body.sessions, 200),
      references: clean(body.references, MAX_FIELD),
      aiDeclaration: clean(body.aiDeclaration, MAX_DECLARATION),
    };
    for (const key of Object.keys(details) as (keyof NotebookDetails)[]) {
      if (details[key] === undefined) delete details[key];
    }

    notebook.details = details;
    await saveNotebook(notebook);

    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
