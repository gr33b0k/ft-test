import {
  type Question,
  type QuestionType,
  isChoiceType,
} from "@/entities/form/model";

export function newQuestion(type: QuestionType): Question {
  const q: Question = {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    label: "",
    required: false,
  };
  if (isChoiceType(type)) q.options = ["", ""];
  return q;
}

export function cleanupQuestion(q: Question): Question;
export function cleanupQuestion(q: Question, type: QuestionType): Question;
export function cleanupQuestion(q: Question, type?: QuestionType): Question {
  const next: Question = { ...q, label: q.label.trim() };
  if (type) next.type = type;
  if (isChoiceType(next.type)) {
    next.options = (next.options ?? ["", ""]).map((o) => o.trim());
  } else {
    delete next.options;
  }
  return next;
}

export function validateDraft(
  title: string,
  questions: Question[],
): string[] {
  const errors: string[] = [];
  if (title.trim() === "") errors.push("Укажите название формы");
  if (questions.length === 0) errors.push("Добавьте хотя бы один вопрос");
  questions.forEach((q, i) => {
    const where = `Вопрос ${i + 1}: `;
    if (q.label.trim() === "") errors.push(`${where}пустой текст вопроса`);
    if (isChoiceType(q.type)) {
      const options = (q.options ?? [])
        .map((o) => o.trim())
        .filter((o) => o !== "");
      if (options.length < 2)
        errors.push(`${where}нужно минимум два непустых варианта ответа`);
      else if (new Set(options).size !== options.length)
        errors.push(`${where}варианты ответа повторяются`);
    }
  });
  return errors;
}
