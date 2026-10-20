export type QuestionType = 'text' | 'select' | 'checkbox' | 'radio'

export interface Question {
  id: string
  type: QuestionType
  label: string
  options?: string[]
  required: boolean
}

export interface Form {
  id: string
  title: string
  description?: string
  questions: Question[]
  published: boolean
  slug: string
  createdAt: string
  updatedAt: string
}

export interface Answer {
  questionId: string
  value: string | string[]
}

export interface Attempt {
  id: string
  formId: string
  answers: Answer[]
  status: 'started' | 'submitted'
  createdAt: string
}

export const QUESTION_TYPES: QuestionType[] = ['text', 'select', 'checkbox', 'radio']

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Текст',
  select: 'Выпадающий список',
  checkbox: 'Чекбоксы',
  radio: 'Радиокнопки',
}

export function isChoiceType(type: QuestionType): boolean {
  return type === 'select' || type === 'checkbox' || type === 'radio'
}

export function publicFormUrl(slug: string): string {
  return `${window.location.origin}/f/${slug}`
}
