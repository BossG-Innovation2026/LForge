import { readFileSync, writeFileSync } from "node:fs";
import { readZip, buildZip } from "../src/lib/docx-zip.ts";
import { applyFieldsToXml } from "../src/lib/docx-fill.ts";

const TAGGED = "public/template-official-tagged.docx";
const OUT = "C:/Users/BossG/AppData/Local/Temp/opencode/filled-sample.docx";
const DOC = "word/document.xml";

const entries = await readZip(new Uint8Array(readFileSync(TAGGED)));
const docEntry = entries.find((e) => e.name === DOC);
if (!docEntry) throw new Error("document.xml missing");

let xml = new TextDecoder().decode(docEntry.data);

const beforeMarkers = (xml.match(/\{\{LF_/g) ?? []).length;
if (beforeMarkers !== 17) throw new Error(`Expected 17 markers, found ${beforeMarkers}`);

const fields = {
  "{{LF_TITLE}}": "Photosynthesis: How Plants Make Food",
  "{{LF_LEARNING_AREA}}": "Science",
  "{{LF_TEACHERS}}": "Juan A. Dela Cruz",
  "{{LF_GRADE_SECTION}}": "Grade 7 - Sampaguita",
  "{{LF_SESSIONS}}": "4",
  "{{LF_REFERENCES}}": "- DepEd Science 7 LM\n- https://example.com/photosynthesis",
  "{{LF_AI_DECLARATION}}": "Drafted with LessonForge; reviewed and approved by the teacher.",
  "{{LF_COMPETENCY}}": "Describe the process of photosynthesis and its importance.",
  "{{LF_OBJECTIVES}}": "- Identify reactants and products\n- Explain the role of chlorophyll\n- Diagram the process",
  "{{LF_LEARNER_CONTEXT}}": "Learners can describe plant needs but confuse food production with nutrient uptake.",
  "{{LF_PRE_LESSON}}": "Picture analysis: what does this plant need to stay alive?",
  "{{LF_FLOW}}": "1. Motivation\n2. Discussion\n3. Group activity\n4. Reporting",
  "{{LF_RESOURCES}}": "- Activity sheets\n- Plant samples",
  "{{LF_INTEGRATION}}": "N/A",
  "{{LF_FORMATIVE_ASSESSMENT}}": "Exit ticket: label the photosynthesis equation.",
  "{{LF_EXTENDED}}": "Grow-a-plant journal for one week.",
  "{{LF_REFLECTIONS}}": "<to be filled after the session> & special chars test 'quotes' \"double\"",
};

xml = applyFieldsToXml(xml, fields);

if (/\{\{LF_/.test(xml)) {
  const leftover = xml.match(/\{\{LF_[A-Z_]+\}\}/g) ?? [];
  throw new Error(`Unreplaced markers remain: ${leftover.join(", ")}`);
}
for (const [marker, value] of Object.entries(fields)) {
  const probe = value.split("\n")[0].slice(0, 24);
  if (!xml.includes(probe.replace(/&/g, "&amp;").replace(/</g, "&lt;").slice(0, 12))) {
    if (!xml.includes(marker)) continue;
    throw new Error(`Content for ${marker} not found in output XML`);
  }
}

const outEntries = entries.map((e) =>
  e.name === DOC ? { name: e.name, data: new TextEncoder().encode(xml) } : e
);
const outBytes = await buildZip(outEntries);

const roundtrip = await readZip(outBytes);
const rtDoc = roundtrip.find((e) => e.name === DOC);
if (!rtDoc || !new TextDecoder().decode(rtDoc.data).includes("Photosynthesis: How Plants Make Food")) {
  throw new Error("Round-trip verification failed");
}
if ((await readZip(outBytes)).length !== entries.length) throw new Error("Entry count changed");

writeFileSync(OUT, outBytes);
console.log(`OK: 17/17 fields filled, zip valid (${roundtrip.length} entries), written to ${OUT}`);
