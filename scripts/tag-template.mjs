import { readFileSync, writeFileSync } from "node:fs";
import { readZip, buildZip } from "../src/lib/docx-zip.ts";

const SRC = "public/Template.docx";
const OUT = "public/template-official-tagged.docx";
const DOC = "word/document.xml";

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function plainText(xml) {
  return decodeEntities(
    xml
      .replace(/<w:tab[^>]*\/>/g, " ")
      .replace(/<w:br[^>]*\/>/g, " ")
      .replace(/<[^>]+>/g, "")
  ).replace(/\s+/g, " ")
   .trim();
}

function rowLabel(trXml) {
  const firstTcStart = trXml.indexOf("<w:tc>");
  if (firstTcStart < 0) return null;
  const firstTcEnd = trXml.indexOf("</w:tc>", firstTcStart);
  if (firstTcEnd < 0) return null;
  return plainText(trXml.slice(firstTcStart + 6, firstTcEnd));
}

const MARKERS = [
  ["lesson title", "{{LF_TITLE}}"],
  ["learning area", "{{LF_LEARNING_AREA}}"],
  ["name of teacher", "{{LF_TEACHERS}}"],
  ["grade level and section", "{{LF_GRADE_SECTION}}"],
  ["no. of sessions", "{{LF_SESSIONS}}"],
  ["references", "{{LF_REFERENCES}}"],
  ["declaration of ai use", "{{LF_AI_DECLARATION}}"],
  ["learning competency", "{{LF_COMPETENCY}}"],
  ["learning objectives", "{{LF_OBJECTIVES}}"],
  ["learner context", "{{LF_LEARNER_CONTEXT}}"],
  ["pre-lesson", "{{LF_PRE_LESSON}}"],
  ["flow", "{{LF_FLOW}}"],
  ["learning resources", "{{LF_RESOURCES}}"],
  ["opportunities for integration", "{{LF_INTEGRATION}}"],
  ["formative assessment", "{{LF_FORMATIVE_ASSESSMENT}}"],
  ["extended learning opportunities", "{{LF_EXTENDED}}"],
  ["reflections", "{{LF_REFLECTIONS}}"],
];

function markerFor(label) {
  const norm = label.toLowerCase();
  for (const [, marker] of MARKERS) {
    if (norm.startsWith(prefix)) return marker;
  }
  return null;
}

function injectMarkerIntoSecondCell(trXml, marker) {
  const firstTcStart = trXml.indexOf("<w:tc>");
  const firstTcEnd = trXml.indexOf("</w:tc>", firstTcStart);
  const secondTcStart = trXml.indexOf("<w:tc>", firstTcEnd);
  if (secondTcStart < 0) throw new Error(`Row "${plainText(trXml.slice(0, 400))}" has no second cell.`);
  const secondTcEnd = trXml.indexOf("</w:tc>", secondTcStart);
  if (secondTcEnd < 0) throw new Error("Second cell not closed.");

  let innerStart = secondTcStart + 6;
  let tcPr = "";
  const tcPrStart = trXml.indexOf("<w:tcPr>", innerStart);
  if (tcPrStart === innerStart || (tcPrStart > -1 && /^\s*$/.test(trXml.slice(innerStart, tcPrStart)))) {
    const tcPrEnd = trXml.indexOf("</w:tcPr>", tcPrStart);
    if (tcPrEnd > -1 && tcPrEnd < secondTcEnd) {
      tcPr = trXml.slice(tcPrStart, tcPrEnd + 9);
      innerStart = tcPrEnd + 9;
    }
  }

  const paraStart = trXml.indexOf("<w:p>", innerStart);
  const paraStartAlt = trXml.indexOf("<w:p ", innerStart);
  const pStart =
    paraStart >= 0 && (paraStartAlt < 0 || paraStart < paraStartAlt) ? paraStart : paraStartAlt;
  const pEndClose = trXml.indexOf("</w:p>", Math.max(pStart, innerStart));
  const selfClosed = trXml.indexOf("/>", Math.max(pStart, innerStart));

  let newInner;
  if (pStart > -1 && pStart < secondTcEnd) {
    if (selfClosed > -1 && selfClosed < pEndClose) {
      newInner = `<w:p><w:r><w:t xml:space="preserve">${marker}</w:t></w:r></w:p>`;
    } else if (pEndClose > -1 && pEndClose < secondTcEnd) {
      newInner = trXml.slice(pStart, pEndClose + 6).replace(/<\/w:p>$/, `<w:r><w:t xml:space="preserve">${marker}</w:t></w:r></w:p>`);
    } else {
      newInner = `<w:p><w:r><w:t xml:space="preserve">${marker}</w:t></w:r></w:p>`;
    }
  } else {
    newInner = `<w:p><w:r><w:t xml:space="preserve">${marker}</w:t></w:r></w:p>`;
  }

  return (
    trXml.slice(0, innerStart) +
    tcPr +
    newInner +
    trXml.slice(secondTcEnd)
  );
}

const rawBytes = new Uint8Array(readFileSync(SRC));
const entries = await readZip(rawBytes);
const docEntry = entries.find((e) => e.name === DOC);
if (!docEntry) throw new Error("document.xml missing from template.");

let xml = new TextDecoder().decode(docEntry.data);

for (const [, marker] of MARKERS) {
  if (xml.includes(marker)) throw new Error(`Marker ${marker} already present.`);
}

let replaced = 0;
const usedRows = [];
let searchFrom = 0;

while (true) {
  const trStart = xml.indexOf("<w:tr", searchFrom);
  if (trStart < 0) break;
  const trOpenEnd = xml.indexOf(">", trStart);
  const trEnd = xml.indexOf("</w:tr>", trOpenEnd);
  if (trEnd < 0) break;
  const trXml = xml.slice(trOpenEnd + 1, trEnd);
  const label = rowLabel(trXml);
  if (label) {
    const marker = markerFor(label);
    if (marker) {
      const patched = injectMarkerIntoSecondCell(trXml, marker);
      xml = xml.slice(0, trOpenEnd + 1) + patched + xml.slice(trEnd);
      usedRows.push({ label: plainText(label), marker });
      replaced++;
      searchFrom = trOpenEnd + 1 + patched.length;
      continue;
    }
  }
  searchFrom = trEnd + 8;
}

if (replaced !== MARKERS.length) {
  const found = new Set(usedRows.map((r) => r.marker));
  const missing = MARKERS.filter(([, m]) => !found.has(m)).map(([p]) => p);
  throw new Error(`Expected ${MARKERS.length} rows, matched ${replaced}. Missing prefixes: ${missing.join(", ")}`);
}

for (const [, marker] of MARKERS) {
  const count = xml.split(marker).length - 1;
  if (count !== 1) throw new Error(`Marker ${marker} appears ${count} times (expected 1).`);
}

const outEntries = entries.map((e) =>
  e.name === DOC ? { name: e.name, data: new TextEncoder().encode(xml) } : e
);
const outBytes = await buildZip(outEntries);
writeFileSync(OUT, outBytes);

console.log(`Tagged ${replaced} cells -> ${OUT}`);
usedRows.forEach((r) => console.log(`  ${r.marker.padEnd(26)} <- "${r.label}"`));
