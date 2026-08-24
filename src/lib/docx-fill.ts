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
  checkedBy: "{{LF_CHECKED_BY}}",
  checkedByPosition: "{{LF_CHECKED_BY_POSITION}}",
  notedBy: "{{LF_NOTED_BY}}",
  notedByPosition: "{{LF_NOTED_BY_POSITION}}",
} as const;

const INLINE_MARKERS = new Set<string>([M.preparedBy, M.position, M.date, M.checkedBy, M.checkedByPosition, M.notedBy, M.notedByPosition]);

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function runWithFont(text: string): string {
  return `<w:r><w:rPr><w:rFonts w:ascii="Bookman Old Style" w:hAnsi="Bookman Old Style" w:cs="Bookman Old Style"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function paragraphsFor(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) =>
      line.trim()
        ? `<w:p>${runWithFont(line)}</w:p>`
        : "<w:p/>"
    )
    .join("");
}

function sessionHeaderParagraph(label: string): string {
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="Bookman Old Style" w:hAnsi="Bookman Old Style" w:cs="Bookman Old Style"/></w:rPr><w:t>${escapeXml(label)}</w:t></w:r></w:p><w:p/>`;
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

function deriveReferences(notebook: Notebook): string {
  return notebook.sources
    .map((s) =>
      s.kind === "web" && s.url
        ? `- ${s.name} — ${s.url}`
        : `- ${s.name}`
    )
    .join("\n");
}

function computeSessionDate(baseDate: string, sessionIndex: number): string {
  if (!baseDate.trim()) return baseDate;
  if (sessionIndex === 0) return baseDate;
  const parsed = new Date(baseDate);
  if (isNaN(parsed.getTime())) {
    // Unparseable — just append session label
    return `${baseDate} (Session ${sessionIndex + 1})`;
  }
  parsed.setDate(parsed.getDate() + sessionIndex);
  return parsed.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export function notebookToFillFieldsForSession(notebook: Notebook, sessionIndex: number): Record<string, string> {
  const d = notebook.details ?? {};
  const sp = notebook.result?.sessionPlans?.[sessionIndex];
  const sections = sp ? sp.sections : (notebook.result?.sections ?? []);
  const byId = new Map(sections.map((s) => [s.sectionId, s]));
  const content = (id: string): string => byId.get(id)?.content ?? "";

  const fields: Record<string, string> = {};
  fields[M.title] = notebook.title;
  fields[M.date] = computeSessionDate(d.date ?? "", sessionIndex);
  fields[M.learningArea] = d.learningArea ?? "";
  fields[M.teachers] = (d.teachers ?? "").toUpperCase();
  fields[M.gradeSection] = d.gradeSection ?? "";
  fields[M.sessions] = d.sessions ?? "";
  fields[M.references] = deriveReferences(notebook);
  fields[M.aiDeclaration] = DEFAULT_AI_DECLARATION;
  fields[M.preparedBy] = (d.teachers ?? "").toUpperCase();
  fields[M.position] = d.position ?? "";
  fields[M.checkedBy] = (d.checkedBy ?? "").toUpperCase();
  fields[M.checkedByPosition] = d.checkedByPosition ?? "";
  fields[M.notedBy] = (d.notedBy ?? "").toUpperCase();
  fields[M.notedByPosition] = d.notedByPosition ?? "";

  // competency always from the main result
  const mainByid = new Map((notebook.result?.sections ?? []).map((s) => [s.sectionId, s]));
  fields[M.competency] = mainByid.get("sec-1")?.content ?? "";

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
  out = out.replace(
    /<w:rPr>/g,
    '<w:rPr><w:rFonts w:ascii="Bookman Old Style" w:hAnsi="Bookman Old Style" w:cs="Bookman Old Style"/>'
  );
  out = out.replace(
    /<w:r(?![^>]*>)(?!.*<w:rPr>)/g,
    '<w:r><w:rPr><w:rFonts w:ascii="Bookman Old Style" w:hAnsi="Bookman Old Style" w:cs="Bookman Old Style"/></w:rPr>'
  );
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

