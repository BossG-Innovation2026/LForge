import type { PlanSection, SourceDoc, TemplateSection } from "./types";

export type ProviderId = "gemini" | "groq" | "openrouter" | "together";

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderId;
  free: boolean;
  note?: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "groq",
    free: true,
    note: "Recommended · Free via Groq",
  },
  {
    id: "qwen/qwen3.6-27b",
    name: "Qwen 3.6 27B",
    provider: "groq",
    free: true,
    note: "Fast · Free via Groq",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    provider: "groq",
    free: true,
    note: "Fastest · Free via Groq",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "gemini",
    free: true,
    note: "Free tier · 20 req/day limit",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    free: true,
    note: "Free tier · 20 req/day limit",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    free: true,
    note: "Free tier (rate limited)",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B Instruct",
    provider: "openrouter",
    free: true,
    note: "Free via OpenRouter",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Instruct",
    provider: "openrouter",
    free: true,
    note: "Free via OpenRouter",
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    provider: "openrouter",
    free: true,
    note: "Free via OpenRouter",
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    name: "Llama 3.3 70B Turbo",
    provider: "together",
    free: true,
    note: "Free via Together AI",
  },
  {
    id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo-Free",
    name: "Llama 3.1 8B Turbo",
    provider: "together",
    free: true,
    note: "Free via Together AI",
  },
];

export const DEFAULT_MODEL_ID = "openai/gpt-oss-120b";

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

export function getProviderLabel(provider: ProviderId): string {
  switch (provider) {
    case "gemini": return "Google Gemini";
    case "groq": return "Groq";
    case "openrouter": return "OpenRouter";
    case "together": return "Together AI";
  }
}

export function getProviderEnvKey(provider: ProviderId): string {
  switch (provider) {
    case "gemini": return "GEMINI_API_KEY";
    case "groq": return "GROQ_API_KEY";
    case "openrouter": return "OPENROUTER_API_KEY";
    case "together": return "TOGETHER_API_KEY";
  }
}

/* ------------------------------------------------------------------ */
/* Shared prompt builders (provider-agnostic)                         */
/* ------------------------------------------------------------------ */

export const SYSTEM_INSTRUCTION = `You are LessonForge, an expert curriculum designer who writes practical, classroom-ready lesson plans.

Core rules:
1. Ground every substantive claim, fact, date, definition or example STRICTLY in the provided sources. Never invent facts, page numbers, URLs, statistics or quotations.
2. If a template section cannot be meaningfully filled from the sources, still write it using sound pedagogy, but do not fabricate source content. You may leave a short bracketed note like "[Add specific exercise from textbook]" where the teacher must insert material.
3. Write for teachers: concrete activities, timings, questions to ask, misconceptions to watch for.
4. Content must be plain text. Use "- " for bullets and "1." for numbered steps. Do NOT use markdown headings, bold/italic markers, tables or code blocks inside section content.
5. Keep each section proportional to its guidance: short guidance -> 2-4 sentences; detailed guidance -> structured bullets/steps.`;

export function sourceBlock(sources: SourceDoc[]): string {
  return sources
    .map((s, i) => {
      const header = `[S${i + 1}] ${s.name}${s.url ? `\nURL: ${s.url}` : ""}`;
      if (s.kind === "image") return `${header}\n(image on file; not read by the model)`;
      return `${header}\n${s.text}`;
    })
    .join("\n\n---\n\n");
}

export function refIds(sources: SourceDoc[]): string[] {
  return sources.map((_, i) => `S${i + 1}`);
}

export function standardsBlock(standards?: string): string {
  if (!standards) return "";
  return `\n## NON-NEGOTIABLE LEARNING COMPETENCY & CURRICULUM STANDARDS\n"""\n${standards}\n"""\nThese standards are fixed by the teacher. Every section you write MUST align with them.\n`;
}

export function sanitizeRefs(refs: unknown, valid: string[]): string[] {
  if (!Array.isArray(refs)) return [];
  const out = refs.filter((r): r is string => typeof r === "string" && valid.includes(r));
  return [...new Set(out)];
}

export function buildFullPlanPrompt(
  sources: SourceDoc[],
  sections: TemplateSection[],
  standards?: string,
  instructions?: string
): string {
  return `${standardsBlock(standards)}${sources.length > 0 ? `## SOURCES\n${sourceBlock(sources)}\n` : "## SOURCES\n(none uploaded - rely on pedagogy, do not invent facts)\n"}
## LESSON PLAN TEMPLATE
${sections
  .map((s) => `<${s.id}> ${s.title}${s.guidance ? `\nGuidance: ${s.guidance}` : ""}`)
  .join("\n")}
## TASK
Write the content for EVERY section listed above.
- sectionId must be exactly the id in angle brackets (e.g. sec-1).
- title should normally match the template title.
- content: the fully written section (plain text, "- " bullets allowed).
- sourceRefs: list which sources you actually used, e.g. ["S1","S2"]. Use [] only if none apply.
Return ONLY valid JSON: {"sections":[{"sectionId":"...","title":"...","content":"...","sourceRefs":[...]},...]}${
    instructions ? `\n\nADDITIONAL TEACHER INSTRUCTIONS (highest priority):\n${instructions}` : ""
  }`;
}

export function buildSingleSectionPrompt(
  sources: SourceDoc[],
  sections: TemplateSection[],
  targetSectionId: string,
  standards?: string,
  instructions?: string,
  feedback?: string,
  previousContent?: string
): string {
  const target = sections.find((s) => s.id === targetSectionId);
  if (!target) throw new Error(`Unknown section "${targetSectionId}".`);
  const others = sections.filter((s) => s.id !== targetSectionId);

  return `${standardsBlock(standards)}${sources.length > 0 ? `## SOURCES\n${sourceBlock(sources)}\n` : "## SOURCES\n(none uploaded - rely on pedagogy, do not invent facts)\n"}
## LESSON PLAN OUTLINE (other sections, for context)
${others.map((s) => `- ${s.title}`).join("\n") || "(none)"}

## SECTION TO WRITE
id: ${target.id}
title: ${target.title}
guidance: ${target.guidance || "(none)"}

## TASK
Write ONLY this section of the lesson plan.
Return ONLY valid JSON: {"sectionId":"${target.id}","title":"...","content":"...","sourceRefs":[...]}
- content: fully written section (plain text, "- " bullets allowed)
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
}

/* ------------------------------------------------------------------ */
/* OpenAI-compatible fetch (Groq / OpenRouter / Together)             */
/* ------------------------------------------------------------------ */

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  extraHeaders?: Record<string, string>
): Promise<unknown> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const e = (await res.json()) as { error?: { message?: string } | string };
      const em = typeof e.error === "string" ? e.error : e.error?.message;
      if (em) msg = em;
    } catch { /* ignore */ }
    throw new Error(`AI API error: ${msg}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("The model returned an empty response. Please try again.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Could not parse model response. Please try again.");
  }
}

/* ------------------------------------------------------------------ */
/* Gemini                                                              */
/* ------------------------------------------------------------------ */

async function callGemini(model: string, prompt: string): Promise<unknown> {
  const { GoogleGenAI, Type } = await import("@google/genai");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (get a free key at https://aistudio.google.com)."
    );
  }
  const client = new GoogleGenAI({ apiKey });
  const schema = {
    type: Type.OBJECT,
    properties: {
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sectionId: { type: Type.STRING },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            sourceRefs: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["sectionId", "title", "content", "sourceRefs"],
        },
      },
      sectionId: { type: Type.STRING },
      title: { type: Type.STRING },
      content: { type: Type.STRING },
      sourceRefs: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
  };
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.6,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });
  const text = response.text;
  if (!text) throw new Error("The model returned an empty response. Please try again.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Could not parse model response. Please try again.");
  }
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

async function callModel(modelId: string, prompt: string): Promise<unknown> {
  const model = getModelById(modelId) ?? { provider: "gemini" as ProviderId, id: modelId };

  switch (model.provider) {
    case "gemini":
      return callGemini(model.id, prompt);

    case "groq": {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY is not set. Add it to .env.local (get a free key at https://console.groq.com).");
      return callOpenAICompatible("https://api.groq.com/openai/v1", apiKey, model.id, prompt);
    }

    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set. Add it to .env.local (get a free key at https://openrouter.ai).");
      return callOpenAICompatible(
        "https://openrouter.ai/api/v1",
        apiKey,
        model.id,
        prompt,
        { "HTTP-Referer": "https://lessonforge.dev", "X-Title": "LessonForge" }
      );
    }

    case "together": {
      const apiKey = process.env.TOGETHER_API_KEY;
      if (!apiKey) throw new Error("TOGETHER_API_KEY is not set. Add it to .env.local (get a free key at https://api.together.ai).");
      return callOpenAICompatible("https://api.together.xyz/v1", apiKey, model.id, prompt);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

interface FullPlanArgs {
  sources: SourceDoc[];
  sections: TemplateSection[];
  instructions?: string;
  standards?: string;
  modelId?: string;
}

export async function generateFullPlan({
  sources,
  sections,
  instructions,
  standards,
  modelId = DEFAULT_MODEL_ID,
}: FullPlanArgs): Promise<PlanSection[]> {
  const refs = refIds(sources);
  const prompt = buildFullPlanPrompt(sources, sections, standards, instructions);
  const data = (await callModel(modelId, prompt)) as {
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

  const result: PlanSection[] = [];
  for (const section of sections) {
    const existing = byId.get(section.id);
    if (existing && existing.content.length > 0) {
      result.push(existing);
    } else {
      result.push(
        await generateSingleSection({
          sources,
          sections,
          targetSectionId: section.id,
          instructions,
          standards,
          modelId,
        })
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
  modelId?: string;
}

export async function generateSingleSection({
  sources,
  sections,
  targetSectionId,
  instructions,
  feedback,
  previousContent,
  standards,
  modelId = DEFAULT_MODEL_ID,
}: SingleSectionArgs): Promise<PlanSection> {
  const target = sections.find((s) => s.id === targetSectionId);
  if (!target) throw new Error(`Unknown section "${targetSectionId}".`);

  const refs = refIds(sources);
  const prompt = buildSingleSectionPrompt(
    sources,
    sections,
    targetSectionId,
    standards,
    instructions,
    feedback,
    previousContent
  );

  const data = (await callModel(modelId, prompt)) as {
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
