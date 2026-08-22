import { GoogleGenAI, Type } from "@google/genai";
import type { Schema } from "@google/genai";
import type { PlanSection, SourceDoc, TemplateSection } from "./types";

const MODEL = "gemini-3.6-flash";

let cachedKey: string | null = null;
let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local in the project root (get a free key at https://aistudio.google.com)."
    );
  }
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedKey = apiKey;
  }
  return cachedClient;
}

const SYSTEM_INSTRUCTION = `You are LessonForge, an expert curriculum designer who writes practical, classroom-ready lesson plans.

Core rules:
1. Ground every substantive claim, fact, date, definition or example STRICTLY in the provided sources. Never invent facts, page numbers, URLs, statistics or quotations.
2. If a template section cannot be meaningfully filled from the sources (for example "homework" when sources say nothing about practice tasks), still write that section using sound pedagogy, but do not fabricate source content. You may leave a short bracketed note like "[Add specific exercise from textbook]" where the teacher must insert material.
3. Write for teachers: concrete activities, timings, questions to ask, misconceptions to watch for.
4. Content must be plain text. Use "- " for bullets and "1." for numbered steps. Do NOT use markdown headings, bold/italic markers, tables or code blocks inside section content.
5. Keep each section proportional to its guidance: short guidance -> 2-4 sentences; detailed guidance -> structured bullets/steps.`;

function sourceBlock(sources: SourceDoc[]): string {
  return sources
    .map((s, i) => {
      const header = `[S${i + 1}] ${s.name}${s.url ? `\nURL: ${s.url}` : ""}`;
      if (s.kind === "image") return `${header}\n(image on file; not read by the model)`;
      return `${header}\n${s.text}`;
    })
    .join("\n\n---\n\n");
}

function refIds(sources: SourceDoc[]): string[] {
  return sources.map((_, i) => `S${i + 1}`);
}

function standardsBlock(standards?: string): string {
  if (!standards) return "";
  return `\n## NON-NEGOTIABLE LEARNING COMPETENCY & CURRICULUM STANDARDS\n"""\n${standards}\n"""\nThese standards are fixed by the teacher. Every section you write MUST align with them: Learning Objectives must decompose the competency into achievable knowledge, skills and tasks; Flow, resources and assessment must serve those objectives. Do not contradict, dilute or drift beyond these standards.\n`;
}

async function generateJson(prompt: string, schema: Schema): Promise<unknown> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.6,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });
  const text = response.text;
  if (!text) {
    throw new Error("The model returned an empty response. Please try again.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Could not parse the model response. Please try again.");
  }
}

/* ------------------------------------------------------------------ */
/* Plan generation                                                     */
/* ------------------------------------------------------------------ */

const SECTION_PROPERTIES = {
  sectionId: { type: Type.STRING },
  title: { type: Type.STRING },
  content: { type: Type.STRING },
  sourceRefs: { type: Type.ARRAY, items: { type: Type.STRING } },
};

const FULL_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: SECTION_PROPERTIES,
        required: ["sectionId", "title", "content", "sourceRefs"],
        propertyOrdering: ["sectionId", "title", "content", "sourceRefs"],
      },
    },
  },
    required: ["sections"],
};

const SINGLE_SECTION_SCHEMA = {
  type: Type.OBJECT,
  properties: SECTION_PROPERTIES,
  required: ["sectionId", "title", "content", "sourceRefs"],
};

interface FullPlanArgs {
  sources: SourceDoc[];
  sections: TemplateSection[];
  instructions?: string;
  standards?: string;
}

export async function generateFullPlan({
  sources,
  sections,
  instructions,
  standards,
}: FullPlanArgs): Promise<PlanSection[]> {
  const refs = refIds(sources);
  const prompt = `${standardsBlock(standards)}${sources.length > 0 ? `## SOURCES\n${sourceBlock(sources)}\n` : "## SOURCES\n(none uploaded - rely on pedagogy, do not invent facts)\n"}
## LESSON PLAN TEMPLATE
${sections
  .map((s) => `<${s.id}> ${s.title}${s.guidance ? `\nGuidance: ${s.guidance}` : ""}`)
  .join("\n")}
## TASK
Write the content for EVERY section listed above.
- sectionId must be exactly the id in angle brackets (e.g. sec-1).
- title should normally match the template title.
- content: the fully written section (plain text, "- " bullets allowed).
- sourceRefs: list which sources you actually used, e.g. ["S1","S2"]. Use [] only if none apply.${
    instructions ? `\n\nADDITIONAL TEACHER INSTRUCTIONS (highest priority):\n${instructions}` : ""
  }`;

  const data = (await generateJson(prompt, FULL_PLAN_SCHEMA)) as {
    sections?: Array<{
      sectionId?: unknown;
      title?: unknown;
      content?: unknown;
      sourceRefs?: unknown;
    }>;
  };

  const byId = new Map<string, PlanSection>();
  for (const s of data.sections ?? []) {
    if (
      typeof s.sectionId === "string" &&
      typeof s.content === "string" &&
      !byId.has(s.sectionId)
    ) {
      byId.set(s.sectionId, {
        sectionId: s.sectionId,
        title:
          typeof s.title === "string" && s.title.trim()
            ? s.title.trim()
            : sections.find((t) => t.id === s.sectionId)?.title ?? s.sectionId,
        content: s.content.trim(),
        sourceRefs: sanitizeRefs(s.sourceRefs, refs),
      });
    }
  }

  // Fill any sections the model skipped with targeted single-section calls.
  const result: PlanSection[] = [];
  for (const section of sections) {
    const existing = byId.get(section.id);
    if (existing && existing.content.length > 0) {
      result.push(existing);
    } else {
      result.push(
        await generateSingleSection({ sources, sections, targetSectionId: section.id, instructions })
      );
    }
  }
  return result;
}

interface SingleSectionArgs {
  sources: SourceDoc[];
  sections: TemplateSection[];
  targetSectionId: string;
  instructions?: string;
  feedback?: string;
  previousContent?: string;
  standards?: string;
}

function sanitizeRefs(refs: unknown, valid: string[]): string[] {
  if (!Array.isArray(refs)) return [];
  const out = refs.filter((r): r is string => typeof r === "string" && valid.includes(r));
  return [...new Set(out)];
}

export async function generateSingleSection({
  sources,
  sections,
  targetSectionId,
  instructions,
  feedback,
  previousContent,
  standards,
}: SingleSectionArgs): Promise<PlanSection> {
  const target = sections.find((s) => s.id === targetSectionId);
  if (!target) {
    throw new Error(`Unknown section "${targetSectionId}".`);
  }
  const refs = refIds(sources);
  const others = sections.filter((s) => s.id !== targetSectionId);

  const prompt = `${standardsBlock(standards)}${sources.length > 0 ? `## SOURCES\n${sourceBlock(sources)}\n` : "## SOURCES\n(none uploaded - rely on pedagogy, do not invent facts)\n"}
## LESSON PLAN OUTLINE (other sections, for context)
${others.map((s) => `- ${s.title}`).join("\n") || "(none)"}

## SECTION TO WRITE
id: ${target.id}
title: ${target.title}
guidance: ${target.guidance || "(none)"}

## TASK
Write ONLY this section of the lesson plan.
Return an object with:
- sectionId: "${target.id}"
- title: the section title
- content: the fully written section (plain text, "- " bullets allowed)
- sourceRefs: which sources you used, e.g. ["S1"]. Use [] if none apply.
Stay consistent with the other section titles listed above.${
    previousContent && feedback
      ? `\n\nPREVIOUS VERSION OF THIS SECTION:\n"""\n${previousContent}\n"""\n\nREVISION REQUEST FROM THE TEACHER (highest priority):\n${feedback}`
      : ""
  }${
    instructions && !(previousContent && feedback)
      ? `\n\nADDITIONAL TEACHER INSTRUCTIONS (highest priority):\n${instructions}`
      : ""
  }`;

  const data = (await generateJson(prompt, SINGLE_SECTION_SCHEMA)) as {
    sectionId?: unknown;
    title?: unknown;
    content?: unknown;
    sourceRefs?: unknown;
  };

  const content = typeof data.content === "string" ? data.content.trim() : "";
  if (!content) {
    throw new Error(`The model returned no content for "${target.title}". Please try again.`);
  }
  return {
    sectionId: target.id,
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : target.title,
    content,
    sourceRefs: sanitizeRefs(data.sourceRefs, refs),
  };
}
