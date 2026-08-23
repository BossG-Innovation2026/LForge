export type SourceKind =
  | "pdf"
  | "docx"
  | "pptx"
  | "txt"
  | "html"
  | "image"
  | "web";

export interface SourceDoc {
  id: string;
  name: string;
  kind: SourceKind;
  /** Extracted text for pdf/docx/pptx/web; empty for images. */
  text: string;
  chars: number;
  addedAt: string;
  /** For kind === "web": the source URL. */
  url?: string;
  /** For kind === "image": compressed data URL (jpeg/png base64). */
  dataUrl?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  guidance: string;
}

export interface TemplateInfo {
  fileName?: string;
  sections: TemplateSection[];
}

export interface PlanSection {
  sectionId: string;
  title: string;
  content: string;
  sourceRefs: string[];
  approvedAt?: string;
}

export interface SessionPlan {
  sessionNumber: number;
  sections: PlanSection[];
}

export interface PlanResult {
  generatedAt: string;
  instructions?: string;
  sections: PlanSection[];
  sessionPlans?: SessionPlan[];
}

export interface NotebookDetails {
  competency?: string;
  contentStandard?: string;
  learningArea?: string;
  teachers?: string;
  position?: string;
  gradeSection?: string;
  sessions?: string;
  date?: string;
  learnerContext?: string;
}

export interface Notebook {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sources: SourceDoc[];
  template: TemplateInfo | null;
  details?: NotebookDetails;
  result: PlanResult | null;
}

export interface NotebookSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceCount: number;
  hasTemplate: boolean;
  hasResult: boolean;
}
