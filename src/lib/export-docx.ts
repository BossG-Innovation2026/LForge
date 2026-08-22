import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
} from "docx";
import type { Notebook } from "./types";

function contentParagraphs(content: string): Paragraph[] {
  const out: Paragraph[] = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      out.push(new Paragraph({ text: "" }));
      continue;
    }
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      out.push(
        new Paragraph({
          text: bulletMatch[1],
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numberedMatch) {
      out.push(
        new Paragraph({
          text: numberedMatch[1],
          numbering: { reference: "lf-numbered", level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }
    out.push(
      new Paragraph({
        text: line,
        spacing: { after: 120 },
      })
    );
  }
  return out;
}

export async function buildLessonDocx(notebook: Notebook): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: notebook.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
    })
  );

  if (notebook.result?.generatedAt) {
    children.push(
      new Paragraph({
        text: `Generated with LessonForge - ${new Date(
          notebook.result.generatedAt
        ).toLocaleString()}`,
        run: { italics: true, size: 18 },
        spacing: { after: 40 },
      })
    );
    children.push(
      new Paragraph({
        text: "All sections reviewed and approved",
        run: { italics: true, size: 18 },
        spacing: { after: 240 },
      })
    );
  }

  const bySectionId = new Map(
    (notebook.result?.sections ?? []).map((s) => [s.sectionId, s])
  );
  const ordered = notebook.template
    ? notebook.template.sections
        .map((t) => bySectionId.get(t.id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s) && Boolean(s!.approvedAt))
    : [];

  for (const section of ordered) {
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );
    children.push(...contentParagraphs(section.content));
  }

  if (notebook.sources.length > 0) {
    children.push(
      new Paragraph({
        text: "Sources",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 120 },
      })
    );
    notebook.sources.forEach((source, i) => {
      children.push(
        new Paragraph({
          text: `[S${i + 1}] ${source.name}`,
          bullet: { level: 0 },
        })
      );
    });
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "lf-numbered",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

export function safeFileName(title: string): string {
  const base = title.replace(/[^\w\d- ]+/g, "").trim().replace(/\s+/g, "-");
  return `${base || "lesson-plan"}.docx`;
}
