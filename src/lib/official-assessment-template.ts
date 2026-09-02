import type { TemplateSection } from "./types";

export interface AssessmentTemplateSection {
  id: string;
  title: string;
  guidance: string;
}

export const ASSESSMENT_BASE_SECTIONS: AssessmentTemplateSection[] = [
  {
    id: "overview",
    title: "Assessment Overview",
    guidance:
      "Write a brief overview of the assessment: its purpose, alignment to the learning competency, target learners, and how results will be used to inform instruction. Include the assessment type (formative, summative, diagnostic, or performance task).",
  },
];

export const ASSESSMENT_ITEM_SECTION: AssessmentTemplateSection = {
  id: "item",
  title: "Item",
  guidance:
    "Generate a single assessment item/question. Include: (1) the question stem clearly testing the learning competency; (2) answer choices for multiple choice (A-D) or true/false; (3) the correct answer; (4) a brief explanation of why it's correct. Make it appropriate for the grade level.",
};

export const ASSESSMENT_END_SECTIONS: AssessmentTemplateSection[] = [
  {
    id: "answer-key",
    title: "Answer Key and Scoring Guide",
    guidance:
      "Provide a complete answer key with correct answers for all items. For essay/performance tasks, include a scoring rubric with point values. Include brief explanations for why each answer is correct.",
  },
  {
    id: "rubric",
    title: "Scoring Rubric",
    guidance:
      "For essay and performance tasks, create a detailed scoring rubric. Include: (1) criteria for evaluation; (2) performance levels (e.g., Excellent, Good, Satisfactory, Needs Improvement); (3) point values for each level; (4) specific descriptors for what each level looks like.",
  },
  {
    id: "administration-guide",
    title: "Administration Guide",
    guidance:
      "Provide practical guidance for administering the assessment: (1) materials needed; (2) time allocation per item; (3) instructions to read to students; (4) accommodations for learners with special needs; (5) tips for maintaining academic integrity.",
  },
];

export function officialAssessmentTemplateSections(numberOfItems: number = 10): TemplateSection[] {
  const sections: TemplateSection[] = [];

  // Add individual item sections
  for (let i = 1; i <= numberOfItems; i++) {
    sections.push({
      id: `assessment-item-${i}`,
      title: `Item ${i}`,
      guidance: ASSESSMENT_ITEM_SECTION.guidance,
    });
  }

  // Add end sections (answer key, rubric, administration guide)
  const endOffset = numberOfItems + 1;
  ASSESSMENT_END_SECTIONS.forEach((section, idx) => {
    sections.push({
      id: `assessment-${endOffset + idx}`,
      title: section.title,
      guidance: section.guidance,
    });
  });

  return sections;
}
