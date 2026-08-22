export type SourceKind = "pdf" | "docx";

export interface SourceDoc {
  id: string;
  name: string;
  kind: SourceKind;
  text: string;
  chars: number;
  addedAt: string;
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

export interface PlanResult {
  generatedAt: string;
  instructions?: string;
  sections: PlanSection[];
}

export interface NotebookDetails {
  competency?: string;
  learningArea?: string;
  teachers?: string;
  gradeSection?: string;
  sessions?: string;
  references?: string;
  aiDeclaration?: string;
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
