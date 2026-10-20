import { Form, Question, QuestionType, Answer } from "./models";

export class HttpError extends Error {
  status: number;
  details?: string[];

  constructor(status: number, message: string, details?: string[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const QUESTION_TYPES: QuestionType[] = ["text", "select", "checkbox", "radio"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateQuestions(questions: unknown, { partial }: { partial: boolean }): Question[] {
  if (!Array.isArray(questions)) {
    throw new HttpError(400, "questions должен быть массивом");
  }
  if (partial && questions.length === 0) {
    throw new HttpError(400, "форма должна содержать хотя бы один вопрос");
  }
  return questions.map((raw, index): Question => {
    const where = `questions[${index}]`;
    if (!isRecord(raw)) {
      throw new HttpError(400, `${where}: должен быть объектом`);
    }

    if (!QUESTION_TYPES.includes(raw.type as QuestionType)) {
      throw new HttpError(400, `${where}.type: допустимы ${QUESTION_TYPES.join(", ")}`);
    }
    const type = raw.type as QuestionType;

    if (!isNonEmptyString(raw.label)) {
      throw new HttpError(400, `${where}.label: обязательное непустое поле`);
    }

    if (typeof raw.required !== "boolean") {
      throw new HttpError(400, `${where}.required: должно быть boolean`);
    }

    const needsOptions = type === "select" || type === "checkbox" || type === "radio";
    if (needsOptions) {
      const options = raw.options;
      if (
        !Array.isArray(options) ||
        options.length < 2 ||
        !options.every((o) => isNonEmptyString(o)) ||
        new Set(options.map((o) => String(o).trim())).size !== options.length
      ) {
        throw new HttpError(400, `${where}.options: нужно минимум 2 уникальных непустых варианта`);
      }
    }

    const question: Question = {
      id: isNonEmptyString(raw.id) ? raw.id : crypto.randomUUID(),
      type,
      label: String(raw.label).trim(),
      required: raw.required,
    };
    if (needsOptions) {
      question.options = (raw.options as string[]).map((o) => o.trim());
    }
    return question;
  });
}

export function parseFormPayload(body: unknown): { title: string; description?: string; questions: Question[] } {
  if (!isRecord(body)) {
    throw new HttpError(400, "Ожидается JSON-объект");
  }
  if (!isNonEmptyString(body.title)) {
    throw new HttpError(400, "title: обязательное непустое поле");
  }
  const payload: { title: string; description?: string; questions: Question[] } = {
    title: body.title.trim(),
    questions: validateQuestions(body.questions, { partial: false }),
  };
  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      throw new HttpError(400, "description: должна быть строкой");
    }
    payload.description = body.description;
  }
  return payload;
}

export function parseAttemptPayload(body: unknown): Answer[] {
  if (!isRecord(body) || !Array.isArray(body.answers)) {
    throw new HttpError(400, "Ожидается JSON-объект с массивом answers");
  }
  return body.answers.map((raw, index): Answer => {
    const where = `answers[${index}]`;
    if (!isRecord(raw)) {
      throw new HttpError(400, `${where}: должен быть объектом`);
    }
    if (!isNonEmptyString(raw.questionId)) {
      throw new HttpError(400, `${where}.questionId: обязательное поле`);
    }
    const value = raw.value;
    const isValid =
      typeof value === "string" || (Array.isArray(value) && value.every((v) => typeof v === "string"));
    if (!isValid) {
      throw new HttpError(400, `${where}.value: должна быть строкой или массивом строк`);
    }
    return { questionId: raw.questionId, value: value as string | string[] };
  });
}

export function checkAttempt(form: Form, answers: Answer[]): Answer[] {
  const errors: string[] = [];
  const byQuestion = new Map<string, Answer>();
  for (const a of answers) {
    if (byQuestion.has(a.questionId)) {
      errors.push(`Дублирующийся ответ на вопрос ${a.questionId}`);
    }
    byQuestion.set(a.questionId, a);
  }

  const checked: Answer[] = [];
  for (const question of form.questions) {
    const answer = byQuestion.get(question.id);
    byQuestion.delete(question.id);

    if (!answer || (typeof answer.value === "string" && answer.value.trim() === "")) {
      if (question.required) {
        errors.push(`Пропущен обязательный вопрос: «${question.label}»`);
      }
      continue;
    }

    const { type, options, label } = question;
    const value = answer.value;

    if (type === "checkbox") {
      if (!Array.isArray(value)) {
        errors.push(`Ответ на «${label}» должен быть массивом`);
        continue;
      }
      const chosen = value.map((v) => v.trim());
      const invalid = chosen.filter((c) => !(options ?? []).includes(c));
      if (invalid.length > 0) {
        errors.push(`Ответ на «${label}» содержит недопустимые варианты: ${invalid.join(", ")}`);
        continue;
      }
      if (question.required && chosen.length === 0) {
        errors.push(`Пропущен обязательный вопрос: «${label}»`);
        continue;
      }
      checked.push({ questionId: question.id, value: chosen });
      continue;
    }

    if (type === "text") {
      const text = (value as string).trim();
      if (text === "") {
        if (question.required) errors.push(`Пропущен обязательный вопрос: «${label}»`);
        continue;
      }
      checked.push({ questionId: question.id, value: text });
      continue;
    }

    // select / radio — одна строка из options
    const choice = (value as string).trim();
    if (choice === "") {
      if (question.required) errors.push(`Пропущен обязательный вопрос: «${label}»`);
      continue;
    }
    if (!(options ?? []).includes(choice)) {
      errors.push(`Ответ на «${label}» не входит в список вариантов`);
      continue;
    }
    checked.push({ questionId: question.id, value: choice });
  }

  const unknownIds = [...byQuestion.keys()];
  if (unknownIds.length > 0) {
    errors.push(`Ответы на несуществующие вопросы: ${unknownIds.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new HttpError(400, "Проверьте ответы на форме", errors);
  }
  return checked;
}
