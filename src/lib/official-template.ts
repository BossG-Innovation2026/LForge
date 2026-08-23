import type { TemplateSection } from "./types";

export const OFFICIAL_TEMPLATE_FILE_NAME = "DepEd Lesson Plan Format (DO 016 s.2026 — ILAW Framework)";

export const DEFAULT_AI_DECLARATION =
  "This lesson plan was drafted with the assistance of LessonForge (AI-powered) " +
  "based on teacher-provided sources and instructions, aligned with the ILAW Framework " +
  "under DepEd Order No. 016, s. 2026. All generated content was reviewed, refined where " +
  "necessary, and approved by the teacher before finalization.";

export interface OfficialSection {
  id: string;
  title: string;
  guidance: string;
}

export const OFFICIAL_SECTIONS: OfficialSection[] = [
  {
    id: "competency",
    title: "Learning Competency and Curriculum Standards",
    guidance:
      "Write the competency/ies from the curriculum that we are targeting, and the content or performance standards applicable to the sessions.",
  },
  {
    id: "objectives",
    title: "Learning Objectives",
    guidance:
      "Write the smaller knowledge, skills, or tasks from the competency that the learners will work on and be able to show by the end of the sessions.",
  },
  {
    id: "learner-context",
    title: "Learner Context",
    guidance:
      "Write your observations of your learners, and how they have been performing or responding to learning experiences recently. Include strengths, interests, and possible barriers to learning.",
  },
  {
    id: "pre-lesson",
    title: "Pre-Lesson",
    guidance: "Describe how you will help the learners get ready for the lesson.",
  },
  {
    id: "flow",
    title: "Flow",
    guidance:
      "Describe the activities that you can implement in 1 or more sessions to meet the learning objectives. Apply the Learning Design Principles: make the objectives clear for the learners; guide learners before letting them try the task on their own; check the state of the learners' well-being, understanding, and mastery over the lesson; connect today's new concepts to past competencies; encourage collaboration among learners; invite learners to reflect on why this matters to them; ensure inclusion for learners' varied abilities, learning styles, and contexts.",
  },
  {
    id: "resources",
    title: "Learning Resources",
    guidance:
      "List down the learning resources that will help you reach your objectives. Ensure that they are available and inclusive. Include options and alternatives in case of emergencies.",
  },
  {
    id: "integration",
    title: "Opportunities for Integration",
    guidance:
      "Write down any possibilities to meaningfully integrate another learning area, special topic, or technology. Write N/A if none.",
  },
  {
    id: "assessment",
    title: "Formative Assessment",
    guidance:
      "Create a task, activity or questions to evaluate learning and provide feedback every now and then. Include ways for learners to ask for guidance or support throughout each session. Remember to provide appropriate accommodations so all learners can demonstrate their understanding (e.g., varied response formats, small group options, visual or auditory supports).",
  },
  {
    id: "extended-learning",
    title: "Extended Learning Opportunities",
    guidance:
      "Suggest other learning experiences outside the classroom/class hours that learners may want to access to reinforce what they have learned, to spark their curiosities further, or that may provide them support in their areas of difficulty.",
  },
  {
    id: "reflections",
    title: "Reflections",
    guidance:
      "Think about what you need to change for the next session based on what happened today. Is there something the learners are interested in exploring? Are there some things you would like to share with your co-teachers, parents, or school leaders about your classroom experience? What would you like your instructional coach to help you with?",
  },
];

export function officialTemplateSections(): TemplateSection[] {
  return OFFICIAL_SECTIONS.map((s, i) => ({
    id: `sec-${i + 1}`,
    title: s.title,
    guidance: s.guidance,
  }));
}
