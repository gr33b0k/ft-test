import { describe, expect, it } from "vitest";
import { buildAttemptsCsv } from "./csv";
import { type Attempt, type Form } from "@/entities/form/model";

const form: Form = {
  id: "f1",
  title: "Форма",
  questions: [
    { id: "q1", type: "text", label: "Как вас зовут?", required: true },
    { id: "q2", type: "checkbox", label: "Навыки", options: ["React", "Vue"], required: false },
  ],
  published: true,
  slug: "forma",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function attempt(answers: { questionId: string; value: string | string[] }[]): Attempt {
  return {
    id: "a1",
    formId: "f1",
    answers: answers.map((a) => ({ ...a })),
    status: "submitted",
    createdAt: "2026-02-02T10:30:00Z",
  };
}

describe("buildAttemptsCsv", () => {
  it("BOM в начале файла", () => {
    expect(buildAttemptsCsv({ form, attempts: [] }).charCodeAt(0)).toBe(0xFEFF);
  });

  it("заголовок из label вопросов", () => {
    const csv = buildAttemptsCsv({ form, attempts: [] });
    expect(csv).toContain('"Дата отправки"');
    expect(csv).toContain('"Как вас зовут?"');
    expect(csv).toContain('"Навыки"');
  });

  it("ячейки экранируются двойными кавычками", () => {
    const csv = buildAttemptsCsv({
      form: {
        ...form,
        questions: [{ id: "q1", type: "text", label: "Ответ со \"кавычкой\"", required: false }],
      },
      attempts: [attempt([{ questionId: "q1", value: 'он сказал "привет"' }])],
    });
    expect(csv).toContain('"он сказал ""привет"""');
  });

  it("чекбокс-ответы склеиваются через ; ", () => {
    const csv = buildAttemptsCsv({
      form,
      attempts: [attempt([{ questionId: "q2", value: ["React", "Vue"] }])],
    });
    expect(csv).toContain("React; Vue");
  });

  it("пропущенный ответ — пустая ячейка", () => {
    const csv = buildAttemptsCsv({ form, attempts: [attempt([])] });
    const dataRow = csv.split("\n").pop()!;
    // дата с запятой экранируется кавычками; два пустых ответа — две пустые ячейки в конце
    expect(dataRow).toMatch(/","",""$/);
  });

  it("каждая строка — на своей строке", () => {
    const csv = buildAttemptsCsv({
      form,
      attempts: [attempt([]), attempt([])],
    });
    expect(csv.split("\n")).toHaveLength(3); // заголовок + 2 строки
  });
});
