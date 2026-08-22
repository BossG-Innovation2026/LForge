import type { Notebook } from "./types";
import { readZip, buildZip } from "./docx-zip.ts";
import { DEFAULT_AI_DECLARATION } from "./official-template";

export const TAGGED_TEMPLATE_PATH = "/template-official-tagged.docx";
const DOC_ENTRY = "word/document.xml";

const M = {
  title: "{{LF_TITLE}}",
  date: "{{LF_DATE}}",
  learningArea: "{{LF_LEARNING_AREA}}",
  teachers: "{{LF_TEACHERS}}",
  gradeSection: "{{LF_GRADE_SECTION}}",
  sessions: "{{LF_SESSIONS}}",
  references: "{{LF_REFERENCES}}",
  aiDeclaration: "{{LF_AI_DECLARATION}}",
  preparedBy: "{{LF_PREPARED_BY}}",
  position: "{{LF_POSITION}}",
  competency: "{{LF_COMPETENCY}}",
  objectives: "{{LF_OBJECTIVES}}",
  learnerContext: "{{LF_LEARNER_CONTEXT}}",
  preLesson: "{{LF_PRE_LESSON}}",
  flow: "{{LF_FLOW}}",
  resources: "{{LF_RESOURCES}}",
  integration: "{{LF_INTEGRATION}}",
  formativeAssessment: "{{LF_FORMATIVE_ASSESSMENT}}",
  extendedLearning: "{{LF_EXTENDED}}",
  reflections: "{{LF_REFLECTIONS}}",
} as const;

/** Markers filled in place (single <w:t> swap) to preserve run formatting. */
const INLINE_MARKERS = new Set<string>([M.preparedBy, M.position, M.date]);

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraphsFor(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) =>
      line.trim()
        ? `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
        : "<w:p/>"
    )
    .join("");
}

function replaceParagraphContaining(xml: string, marker: string, value: string): string {
  const idx = xml.indexOf(marker);
  if (idx < 0) {
    throw new Error(`Template marker ${marker} was not found. The tagged template may be outdated.`);
  }
  const pStartPlain = xml.lastIndexOf("<w:p>", idx);
  const pStartSpaced = xml.lastIndexOf("<w:p ", idx);
  const pStart = Math.max(pStartPlain, pStartSpaced);
  const pEndClose = xml.indexOf("</w:p>", idx);
  if (pStart < 0 || pEndClose < 0) {
    throw new Error(`Could not resolve paragraph boundaries around ${marker}.`);
  }
  const replacement = value.trim() ? paragraphsFor(value) : "<w:p/>";
  return xml.slice(0, pStart) + replacement + xml.slice(pEndClose + 6);
}

function replaceTextOnly(xml: string, marker: string, value: string): string {
  const idx = xml.indexOf(marker);
  if (idx < 0) {
    throw new Error(`Template marker ${marker} was not found. The tagged template may be outdated.`);
  }
  const tOpen = xml.lastIndexOf("<w:t", idx);
  const tOpenEnd = tOpen >= 0 ? xml.indexOf(">", tOpen) : -1;
  const tClose = xml.indexOf("</w:t>", idx);
  if (tOpen < 0 || tOpenEnd < 0 || tClose < 0 || tOpenEnd > idx || tClose < idx) {
    throw new Error(`Could not resolve text run boundaries around ${marker}.`);
  }
  return xml.slice(0, tOpenEnd + 1) + escapeXml(value) + xml.slice(tClose);
}

/** References are derived from the notebook's sources (files + web links). */
function deriveReferences(notebook: Notebook): string {
  return notebook.sources
    .map((s) =>
      s.kind === "web" && s.url
        ? `- ${s.name} — ${s.url}`
        : `- ${s.name}`
    )
    .join("\n");
}

export function notebookToFillFields(notebook: Notebook): Record<string, string> {
  const d = notebook.details ?? {};
  const byId = new Map(
    (notebook.result?.sections ?? []).map((s) => [s.sectionId, s])
  );
  const content = (id: string): string => byId.get(id)?.content ?? "";
  const fields: Record<string, string> = {};
  fields[M.title] = notebook.title;
  fields[M.date] = d.date ?? "";
  fields[M.learningArea] = d.learningArea ?? "";
  fields[M.teachers] = d.teachers ?? "";
  fields[M.gradeSection] = d.gradeSection ?? "";
  fields[M.sessions] = d.sessions ?? "";
  fields[M.references] = deriveReferences(notebook);
  fields[M.aiDeclaration] = DEFAULT_AI_DECLARATION;
  fields[M.preparedBy] = d.teachers ?? "";
  fields[M.position] = d.position ?? "";
  fields[M.competency] = content("sec-1");
  fields[M.objectives] = content("sec-2");
  fields[M.learnerContext] = content("sec-3");
  fields[M.preLesson] = content("sec-4");
  fields[M.flow] = content("sec-5");
  fields[M.resources] = content("sec-6");
  fields[M.integration] = content("sec-7");
  fields[M.formativeAssessment] = content("sec-8");
  fields[M.extendedLearning] = content("sec-9");
  fields[M.reflections] = content("sec-10");
  return fields;
}

export function applyFieldsToXml(xml: string, fields: Record<string, string>): string {
  let out = xml;
  for (const [marker, value] of Object.entries(fields)) {
    out = INLINE_MARKERS.has(marker)
      ? replaceTextOnly(out, marker, value)
      : replaceParagraphContaining(out, marker, value);
  }
  return out;
}

export async function fillOfficialDocx(
  templateUrl: string,
  fields: Record<string, string>
): Promise<Uint8Array> {
  const res = await fetch(templateUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Official template asset could not be loaded (${res.status}).`);
  }
  const raw = new Uint8Array(await res.arrayBuffer());
  const entries = await readZip(raw);
  const docEntry = entries.find((e) => e.name === DOC_ENTRY);
  if (!docEntry) throw new Error("document.xml missing from official template.");

  const xml = new TextDecoder().decode(docEntry.data);
  const filled = applyFieldsToXml(xml, fields);

  const outEntries = entries.map((e) =>
    e.name === DOC_ENTRY ? { name: e.name, data: new TextEncoder().encode(filled) } : e
  );
  return buildZip(outEntries);
}
