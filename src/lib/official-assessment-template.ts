import type { TemplateSection } from "./types";

export interface AssessmentTemplateSection {
  id: string;
  title: string;
  guidance: string;
}

export const ASSESSMENT_SECTIONS: AssessmentTemplateSection[] = [
  {
    id: "overview",
    title: "Assessment Overview",
    guidance:
      "Write a brief overview of the assessment: its purpose, alignment to the learning competency, target learners, and how results will be used to inform instruction. Include the assessment type (formative, summative, diagnostic, or performance task).",
  },
  {
    id: "items",
    title: "Assessment Items",
    guidance:
      "Generate the assessment items/questions based on the specified item types and number of items. Each item should: (1) clearly test the learning competency; (2) be appropriate for the grade level and learner context; (3) include the question stem, answer choices (for MC/TF), and the correct answer. For essay/performance tasks, include the task description and evaluation criteria. Number all items sequentially.",
  },
  {
    id: "answer-key",
    title: "Answer Key and Scoring Guide",
    guidance:
      "Provide a complete answer key with correct answers for all objective items. For essay/performance tasks, include a scoring rubric with point values. Include brief explanations for why each answer is correct to help the teacher understand the assessment rationale.",
  },
  {
    id: "rubric",
    title: "Scoring Rubric",
    guidance:
      "For essay and performance tasks, create a detailed scoring rubric. Include: (1) criteria for evaluation; (2) performance levels (e.g., Excellent, Good, Satisfactory, Needs Improvement); (3) point values for each level; (4) specific descriptors for what each level looks like. Make the rubric practical and easy to use during grading.",
  },
  {
    id: "administration-guide",
    title: "Administration Guide",
    guidance:
      "Provide practical guidance for administering the assessment: (1) materials needed; (2) time allocation per section/item; (3) instructions to read to students; (4) accommodations for learners with special needs; (5) what to do if students finish early; (6) tips for maintaining academic integrity.",
  },
];

export function officialAssessmentTemplateSections(): TemplateSection[] {
  return ASSESSMENT_SECTIONS.map((s, i) => ({
    id: `assessment-${i + 1}`,
    title: s.title,
    guidance: s.guidance,
  }));
}
