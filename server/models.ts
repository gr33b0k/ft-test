export type QuestionType = "text" | "select" | "checkbox" | "radio";

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  options?: string[];
  required: boolean;
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  published: boolean;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export type AttemptStatus = "started" | "submitted";

export interface Answer {
  questionId: string;
  value: string | string[];
}

export interface Attempt {
  id: string;
  formId: string;
  answers: Answer[];
  status: AttemptStatus;
  createdAt: string;
}
