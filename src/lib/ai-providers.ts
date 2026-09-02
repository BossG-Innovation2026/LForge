import type { PlanSection, SessionPlan, SourceDoc, TemplateSection } from "./types";

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
    id: "groq/compound",
    name: "Compound",
    provider: "groq",
    free: true,
    note: "Groq native · Free",
  },
  {
    id: "groq/compound-mini",
    name: "Compound Mini",
    provider: "groq",
    free: true,
    note: "Groq native · Fast · Free",
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
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra 550B",
    provider: "openrouter",
    free: true,
    note: "Free via OpenRouter",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super 120B",
    provider: "openrouter",
    free: true,
    note: "Free via OpenRouter",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "Nemotron 3.5 Lightning 30B",
    provider: "openrouter",
    free: true,
    note: "Free via OpenRouter",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "openrouter",
    free: true,
    note: "Free via OpenRouter",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B",
    provider: "openrouter",
    free: true,
    note: "Free via OpenRouter",
  },
  {
    id: "Prism-ML/Ternary-Bonsai-27B",
    name: "Ternary Bonsai 27B",
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

export const SYSTEM_INSTRUCTION = `You are LessonForge, an expert Filipino curriculum designer who writes practical, classroom-ready ILAW Framework lesson plans aligned with DepEd Order No. 016, s. 2026.

PRIORITY ORDER (highest to lowest):
1. TOPIC — The specific lesson topic is the central thread. Every section must serve it.
2. COMPETENCY & PERFORMANCE STANDARD — The topic is anchored to and must fully satisfy these standards.
3. LEARNER CONTEXT — This is critical. Every section must be shaped by the actual learners described: their strengths, barriers, readiness, and context. Do not write generic plans — write for THESE learners.
4. SOURCES — Use provided sources as primary grounding. If sources were fetched from the web, cite them meaningfully.

Core rules:
1. If the teacher has provided sources (uploaded files or web links), ground every substantive claim, fact, definition, and example STRICTLY in those sources. Never fabricate facts, page numbers, or quotations.
2. If web-searched sources are provided (marked [WEB]), use them to enrich the plan — cite titles and URLs where relevant.
3. If NO sources at all are available, draw from your training knowledge of Philippine DepEd curriculum, DepEd orders, CHED memoranda, and SHS pedagogy. Reference documents by official title and issuing body only. Do not fabricate URLs or page numbers.
4. The LEARNER CONTEXT section must be a refined, well-written version of what the teacher wrote — preserve every idea and nuance, improve the language and structure, but never change the meaning or strip out details.
5. Every other section (Pre-Lesson, Flow, Assessment, etc.) must visibly reflect the learner context — activities, pacing, scaffolding, and support must match the actual classroom described.
6. Write for teachers: concrete activities, suggested timings, questions to ask, misconceptions to watch for, inclusion strategies.
7. Content must be plain text. Use "- " for bullets and "1." for numbered steps. Do NOT use markdown headings, bold/italic markers, tables, or code blocks.
8. Keep each section proportional: short guidance → 2–4 sentences; detailed guidance → structured bullets/steps.`;

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

export function learnerContextBlock(context?: string): string {
  if (!context) return "";
  return `\n## LEARNER CONTEXT\n"""\n${context}\n"""\nUse this information to tailor activities, pacing, scaffolding, and assessment to the actual learners. Address their strengths, interests, and barriers in your plan.\n`;
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
  instructions?: string,
  learnerContext?: string,
  topic?: string
): string {
  const topicBlock = topic
    ? `\n## LESSON TOPIC (CENTRAL THREAD)\n"""\n${topic}\n"""\nThis is the specific content to be taught. All sections revolve around this topic. It must be anchored to the competency and performance standard below.\n`
    : "";
  const sourceSection = sources.length > 0
    ? `## SOURCES\n${sourceBlock(sources)}\n`
    : `## SOURCES\nNo reference materials uploaded. Use your training knowledge of Philippine DepEd curriculum, DepEd orders, CHED memoranda, and SHS pedagogy. Reference documents by official title and issuing body only. Do not fabricate URLs or page numbers.\n`;
  return `${topicBlock}${standardsBlock(standards)}${learnerContextBlock(learnerContext)}${sourceSection}
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
  previousContent?: string,
  learnerContext?: string,
  topic?: string
): string {
  const target = sections.find((s) => s.id === targetSectionId);
  if (!target) throw new Error(`Unknown section "${targetSectionId}".`);
  const others = sections.filter((s) => s.id !== targetSectionId);

  const topicBlock = topic
    ? `\n## LESSON TOPIC (CENTRAL THREAD)\n"""\n${topic}\n"""\nThis is the specific content to be taught. All sections revolve around this topic.\n`
    : "";
  const sourceSection = sources.length > 0
    ? `## SOURCES\n${sourceBlock(sources)}\n`
    : `## SOURCES\nNo reference materials uploaded. Use your training knowledge of Philippine DepEd curriculum, DepEd orders, CHED memoranda, and SHS pedagogy. Reference documents by official title and issuing body only.\n`;

  return `${topicBlock}${standardsBlock(standards)}${learnerContextBlock(learnerContext)}${sourceSection}
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
  learnerContext?: string;
  topic?: string;
  modelId?: string;
}

export async function generateFullPlan({
  sources,
  sections,
  instructions,
  standards,
  learnerContext,
  topic,
  modelId = DEFAULT_MODEL_ID,
}: FullPlanArgs): Promise<PlanSection[]> {
  const refs = refIds(sources);
  const prompt = buildFullPlanPrompt(sources, sections, standards, instructions, learnerContext, topic);
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
          learnerContext,
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
  learnerContext?: string;
  topic?: string;
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
  learnerContext,
  topic,
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
    previousContent,
    learnerContext,
    topic
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

/* ------------------------------------------------------------------ */
/* Multi-session generation                                            */
/* ------------------------------------------------------------------ */

export function parseSessionCount(sessions?: string): number {
  if (!sessions) return 1;
  const m = sessions.match(/\d+/);
  const n = m ? parseInt(m[0], 10) : 1;
  return Math.max(1, Math.min(n, 10));
}

function sessionContextBlock(
  sessionNum: number,
  totalSessions: number,
  previousSummary?: string
): string {
  const position =
    sessionNum === 1
      ? "first"
      : sessionNum === totalSessions
      ? "final"
      : `session ${sessionNum} of ${totalSessions}`;
  let block = `\n## SESSION INFO\nThis is the ${position} session (${sessionNum} of ${totalSessions} total).\n`;
  if (sessionNum === 1) {
    block += `Focus: introduce the topic, activate prior knowledge, establish objectives clearly.\n`;
  } else if (sessionNum === totalSessions) {
    block += `Focus: consolidate learning, wrap up the competency, strong formative assessment and reflection.\n`;
  } else {
    block += `Focus: build on Session ${sessionNum - 1}, deepen understanding, progress toward the full competency.\n`;
  }
  if (previousSummary) {
    block += `\n## WHAT WAS COVERED IN PREVIOUS SESSION(S)\n"""\n${previousSummary}\n"""\nContinue from where the previous session ended. Do NOT repeat activities already done. Reference prior learning explicitly.\n`;
  }
  return block;
}

function buildSessionPrompt(
  sessionNum: number,
  totalSessions: number,
  sources: SourceDoc[],
  sections: TemplateSection[],
  standards?: string,
  learnerContext?: string,
  topic?: string,
  instructions?: string,
  previousSummary?: string
): string {
  const topicBlock = topic
    ? `\n## CONTENT STANDARD / LESSON TOPIC\n"""\n${topic}\n"""\nThis is the specific content to be taught across all sessions. Anchor this session to it.\n`
    : "";
  const sourceSection =
    sources.length > 0
      ? `## SOURCES\n${sourceBlock(sources)}\n`
      : `## SOURCES\nNo reference materials uploaded. Use your training knowledge of Philippine DepEd curriculum, DepEd orders, CHED memoranda, and SHS pedagogy.\n`;
  return `${topicBlock}${standardsBlock(standards)}${learnerContextBlock(learnerContext)}${sessionContextBlock(sessionNum, totalSessions, previousSummary)}${sourceSection}
## LESSON PLAN TEMPLATE
${sections
    .map((s) => `<${s.id}> ${s.title}${s.guidance ? `\nGuidance: ${s.guidance}` : ""}`)
    .join("\n")}
## TASK
Write a complete lesson plan for SESSION ${sessionNum} OF ${totalSessions}.
- Each section must be specific to THIS session only.
- Objectives must reflect this session's scope — unpack the competency progressively.
- sectionId must be exactly the id in angle brackets (e.g. sec-1).
- content: fully written section (plain text, "- " bullets allowed).
- sourceRefs: sources used, e.g. ["S1"]. Use [] if none.
Return ONLY valid JSON: {"sections":[{"sectionId":"...","title":"...","content":"...","sourceRefs":[...]},...]}${
    instructions ? `\n\nADDITIONAL TEACHER INSTRUCTIONS:\n${instructions}` : ""
  }`;
}

function summarizeSession(sections: PlanSection[]): string {
  const objectives = sections.find((s) => s.title.toLowerCase().includes("objective"));
  const flow = sections.find((s) => s.title.toLowerCase().includes("flow"));
  const parts: string[] = [];
  if (objectives) parts.push(`Objectives covered:\n${objectives.content.slice(0, 400)}`);
  if (flow) parts.push(`Activities done:\n${flow.content.slice(0, 400)}`);
  return parts.join("\n\n");
}

async function generateOneSession(
  sessionNum: number,
  totalSessions: number,
  sources: SourceDoc[],
  sections: TemplateSection[],
  standards: string,
  learnerContext: string | undefined,
  topic: string | undefined,
  instructions: string | undefined,
  previousSummary: string | undefined,
  modelId: string,
  competencySectionId: string
): Promise<PlanSection[]> {
  const generatable = sections.filter((s) => s.id !== competencySectionId);
  const refs = refIds(sources);
  const prompt = buildSessionPrompt(
    sessionNum, totalSessions, sources, generatable,
    standards, learnerContext, topic, instructions, previousSummary
  );

  const data = (await callModel(modelId, prompt)) as {
    sections?: Array<{ sectionId?: unknown; title?: unknown; content?: unknown; sourceRefs?: unknown }>;
  };

  const byId = new Map<string, PlanSection>();
  for (const s of data.sections ?? []) {
    if (typeof s.sectionId === "string" && typeof s.content === "string" && !byId.has(s.sectionId)) {
      byId.set(s.sectionId, {
        sectionId: s.sectionId,
        title: typeof s.title === "string" && s.title.trim() ? s.title.trim() : generatable.find((t) => t.id === s.sectionId)?.title ?? s.sectionId,
        content: s.content.trim(),
        sourceRefs: sanitizeRefs(s.sourceRefs, refs),
      });
    }
  }

  const result: PlanSection[] = [];
  for (const section of generatable) {
    const existing = byId.get(section.id);
    if (existing && existing.content.length > 0) {
      result.push(existing);
    } else {
      result.push(
        await generateSingleSection({ sources, sections: generatable, targetSectionId: section.id, standards, learnerContext, topic, modelId })
      );
    }
  }
  return result;
}

interface MultiSessionArgs {
  sources: SourceDoc[];
  sections: TemplateSection[];
  standards: string;
  sessionCount: number;
  competencySectionId: string;
  instructions?: string;
  learnerContext?: string;
  topic?: string;
  modelId?: string;
}

export async function generateMultiSession({
  sources,
  sections,
  standards,
  sessionCount,
  competencySectionId,
  instructions,
  learnerContext,
  topic,
  modelId = DEFAULT_MODEL_ID,
}: MultiSessionArgs): Promise<SessionPlan[]> {
  const sessionPlans: SessionPlan[] = [];
  let previousSummary: string | undefined;

  for (let i = 1; i <= sessionCount; i++) {
    const planSections = await generateOneSession(
      i, sessionCount, sources, sections, standards,
      learnerContext, topic, instructions, previousSummary, modelId, competencySectionId
    );
    sessionPlans.push({ sessionNumber: i, sections: planSections });
    previousSummary = summarizeSession(planSections);
  }
  return sessionPlans;
}

/* ------------------------------------------------------------------ */
/* Assessment generation                                               */
/* ------------------------------------------------------------------ */

interface AssessmentArgs {
  sources: SourceDoc[];
  sections: TemplateSection[];
  instructions?: string;
  standards?: string;
  learnerContext?: string;
  topic?: string;
  assessmentType?: string;
  numberOfItems?: string;
  itemTypes?: string[];
  difficultyLevel?: string;
  timeLimit?: string;
  totalPoints?: string;
  modelId?: string;
}

export function buildAssessmentPrompt({
  sources,
  sections,
  instructions,
  standards,
  learnerContext,
  topic,
  assessmentType,
  numberOfItems,
  itemTypes,
  difficultyLevel,
  timeLimit,
  totalPoints,
}: AssessmentArgs): string {
  const topicBlock = topic
    ? `\n## LESSON TOPIC\n"""\n${topic}\n"""\nThis is the specific content the assessment covers.\n`
    : "";

  const sourceSection =
    sources.length > 0
      ? `## SOURCES\n${sourceBlock(sources)}\n`
      : `## SOURCES\nNo reference materials uploaded. Use your training knowledge of Philippine DepEd curriculum and assessment design.\n`;

  const assessmentDetails = `
## ASSESSMENT SPECIFICATIONS
- Assessment Type: ${assessmentType || "formative"}
- Number of Items: ${numberOfItems || "10"}
- Item Types: ${itemTypes?.join(", ") || "Multiple Choice, True/False"}
- Difficulty Level: ${difficultyLevel || "Average (mixed difficulty)"}
- Time Limit: ${timeLimit || "No time limit"}
- Total Points: ${totalPoints || "Not specified"}
`;

  return `${topicBlock}${standardsBlock(standards)}${learnerContextBlock(learnerContext)}${assessmentDetails}${sourceSection}
## ASSESSMENT TEMPLATE SECTIONS
${sections.map((s) => `<${s.id}> ${s.title}\nGuidance: ${s.guidance}`).join("\n")}

## TASK
Generate a complete assessment based on the specifications above.
- Write content for EVERY section listed above.
- sectionId must be exactly the id in angle brackets (e.g. assessment-1).
- title should normally match the template title.
- content: the fully written section (plain text, "- " bullets and numbered lists allowed).
- sourceRefs: list which sources you actually used, e.g. ["S1","S2"]. Use [] only if none apply.
- For the Assessment Items section: generate the exact number of items specified, using the item types requested.
- For the Answer Key: include correct answers and brief explanations.
- For the Scoring Rubric: create a practical rubric for essay/performance tasks.

Return ONLY valid JSON: {"sections":[{"sectionId":"...","title":"...","content":"...","sourceRefs":[...]},...]}${
    instructions ? `\n\nADDITIONAL TEACHER INSTRUCTIONS (highest priority):\n${instructions}` : ""
  }`;
}

interface GenerateAssessmentResult {
  sections: import("./types").AssessmentSection[];
}

export async function generateAssessment({
  sources,
  sections,
  instructions,
  standards,
  learnerContext,
  topic,
  assessmentType,
  numberOfItems,
  itemTypes,
  difficultyLevel,
  timeLimit,
  totalPoints,
  modelId = DEFAULT_MODEL_ID,
}: AssessmentArgs): Promise<GenerateAssessmentResult> {
  const refs = refIds(sources);
  const prompt = buildAssessmentPrompt({
    sources,
    sections,
    instructions,
    standards,
    learnerContext,
    topic,
    assessmentType,
    numberOfItems,
    itemTypes,
    difficultyLevel,
    timeLimit,
    totalPoints,
  });

  const data = (await callModel(modelId, prompt)) as {
    sections?: Array<{
      sectionId?: unknown;
      title?: unknown;
      content?: unknown;
      sourceRefs?: unknown;
    }>;
  };

  const byId = new Map<string, import("./types").AssessmentSection>();
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

  const result: import("./types").AssessmentSection[] = [];
  for (const section of sections) {
    const existing = byId.get(section.id);
    if (existing && existing.content.length > 0) {
      result.push(existing);
    }
  }

  return { sections: result };
}
