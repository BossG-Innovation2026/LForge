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
      "Write the specific learning competency/ies from the curriculum guide that this lesson targets, along with the applicable content standard and performance standard.",
  },
  {
    id: "objectives",
    title: "Learning Objectives",
    guidance:
      "Start with: At the end of this session/s the student should be able to: Then write exactly 3 bullet points using '- ' prefix. Each bullet is one direct statement — no labels. Cover: what learners will know, what they will do, and what they will value or appreciate. Keep each to one sentence.",
  },
  {
    id: "learner-context",
    title: "Learner Context",
    guidance:
      "Refine the teacher's written learner context into a clear, well-structured paragraph or short bullets. Preserve every idea, nuance, and detail the teacher provided — only improve the language and organization. Include: learners' current performance and readiness level, their strengths and interests, any barriers to learning (disability, connectivity, language, socioeconomic factors), and how these will shape every section of this lesson plan.",
  },
  {
    id: "pre-lesson",
    title: "Pre-Lesson",
    guidance:
      "Describe concretely how you will prepare learners before the main lesson. Include: (1) a brief well-being or mood check-in activity suited to the learner context; (2) an activation strategy that surfaces prior knowledge connected to today's topic; (3) how you will connect this lesson to a past competency or previous learning experience; (4) a clear statement of the lesson objectives shared with the learners. Keep all activities appropriate for the specific learners described in the Learner Context.",
  },
  {
    id: "flow",
    title: "Flow",
    guidance:
      "Describe the session activities in sequence using phase labels only (e.g. 'Introduction (15 min)', 'Guided Practice (20 min)', 'Collaborative Activity (15 min)', 'Wrap-up (10 min)'). Do NOT use Day 1, Day 2, Day 3 or any day-based labels. Apply ALL six Learning Design Principles explicitly: (1) Make objectives clear — state how you will present the goals to learners. (2) Guided practice before independent work — model first, then scaffold, then release. (3) Check understanding and well-being — include at least one mid-lesson pulse check or formative moment. (4) Connect to past competencies — explicitly link today's concept to prior learning. (5) Encourage collaboration — include at least one paired or group activity. (6) Invite reflection — end each session with a prompt that asks learners why this matters to them. (7) Ensure inclusion — note specific accommodations for varied abilities, learning styles, and contexts described in the Learner Context.",
  },
  {
    id: "resources",
    title: "Learning Resources",
    guidance:
      "List all learning resources needed. For each, note: what it is, where to get it, and whether it is freely available. Then include: (a) inclusive alternatives for learners with limited devices, connectivity, or special needs; (b) emergency alternatives (printed modules, radio/TV broadcast, take-home activity sheets) in case of school disruptions. Align resources to the specific learner context provided.",
  },
  {
    id: "integration",
    title: "Opportunities for Integration",
    guidance:
      "Identify meaningful connections to other learning areas, special topics (Values Ed, Health, Career Guidance), or technology integration. For each connection write: the area, how it connects to today's topic, and one concrete activity that makes the integration visible. Write N/A only if no connection is genuinely possible.",
  },
  {
    id: "assessment",
    title: "Formative Assessment",
    guidance:
      "Design formative assessment for every phase of learning: (1) Before — a quick diagnostic to gauge entry knowledge. (2) During — at least two embedded checks (e.g., exit ticket, think-pair-share, thumbs up/down, short quiz). (3) After — a closing task that demonstrates understanding of the objective. For each assessment: state the task or question, how learners respond, and how the teacher will use the result. Include varied response formats (written, oral, drawing, performance) and small-group or one-on-one options for learners who need support. Note how learners can signal they need help during the session.",
  },
  {
    id: "extended-learning",
    title: "Extended Learning Opportunities",
    guidance:
      "Suggest three tracks of extended learning outside class hours: (1) Reinforcement — for learners who need more support or did not yet meet the objective; provide a simple guided activity they can do at home. (2) Enrichment — for learners who are ready to go deeper; suggest a challenge, a real-world application, or a curiosity-sparking resource. (3) Support — for learners facing barriers (limited internet, home difficulties); suggest an offline or low-resource alternative. Keep suggestions realistic for the learner context described.",
  },
  {
    id: "reflections",
    title: "Reflections",
    guidance:
      "Guide the teacher through four reflection prompts: (1) What will I change for the next session based on how today went? (2) What are learners showing curiosity or enthusiasm about that I can build on? (3) What do I want to share with my co-teachers, parents, or school leaders about today's classroom experience? (4) What specific help do I want from my instructional coach? Write these as open-ended prompts followed by a short model response or note — the teacher will complete them after the lesson.",
  },
];

export function officialTemplateSections(): TemplateSection[] {
  return OFFICIAL_SECTIONS.map((s, i) => ({
    id: `sec-${i + 1}`,
    title: s.title,
    guidance: s.guidance,
  }));
}
