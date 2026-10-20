import { describe, expect, it } from "vitest";
import {
  cleanupQuestion,
  newQuestion,
  validateDraft,
} from "./model";

describe("newQuestion", () => {
  it("создаёт текстовый вопрос без options", () => {
    const q = newQuestion("text");
    expect(q.type).toBe("text");
    expect(q.label).toBe("");
    expect(q.required).toBe(false);
    expect(q.options).toBeUndefined();
    expect(q.id).toBeTruthy();
  });

  it("создаёт choice-вопрос с двумя пустыми вариантами", () => {
    for (const type of ["select", "checkbox", "radio"] as const) {
      const q = newQuestion(type);
      expect(q.options).toEqual(["", ""]);
    }
  });

  it("у вопросов разные id", () => {
    expect(newQuestion("text").id).not.toBe(newQuestion("text").id);
  });
});

describe("cleanupQuestion", () => {
  it("триммит label и варианты", () => {
    const q = cleanupQuestion({
      id: "1",
      type: "select",
      label: "  Курс  ",
      options: [" 1 ", " 2 "],
      required: false,
    });
    expect(q.label).toBe("Курс");
    expect(q.options).toEqual(["1", "2"]);
  });

  it("не choice-тип теряет options", () => {
    const q = cleanupQuestion({
      id: "1",
      type: "text",
      label: "x",
      options: ["a", "b"],
      required: false,
    });
    expect(q.options).toBeUndefined();
  });

  it("choice-тип без options получает пустые по умолчанию", () => {
    const q = cleanupQuestion({
      id: "1",
      type: "checkbox",
      label: "x",
      required: false,
    });
    expect(q.options).toEqual(["", ""]);
  });

  it("смена типа: text → radio добавляет options", () => {
    const q = cleanupQuestion(
      { id: "1", type: "text", label: "x", required: false },
      "radio",
    );
    expect(q.type).toBe("radio");
    expect(q.options).toEqual(["", ""]);
  });

  it("смена типа: checkbox → text удаляет options", () => {
    const q = cleanupQuestion(
      { id: "1", type: "checkbox", label: "x", options: ["a"], required: false },
      "text",
    );
    expect(q.type).toBe("text");
    expect(q.options).toBeUndefined();
    expect(q.label).toBe("x");
    expect(q.required).toBe(false);
  });

  it("не мутирует исходный объект", () => {
    const src = {
      id: "1",
      type: "text" as const,
      label: " x ",
      required: false,
    };
    cleanupQuestion(src);
    expect(src.label).toBe(" x ");
  });
});

describe("validateDraft", () => {
  it("пустое название и нет вопросов", () => {
    const errors = validateDraft("", []);
    expect(errors).toContain("Укажите название формы");
    expect(errors).toContain("Добавьте хотя бы один вопрос");
  });

  it("не ругается, если название только из пробелов — тоже ошибка", () => {
    expect(validateDraft("   ", [])).toContain("Укажите название формы");
  });

  it("валидный черновик без ошибок", () => {
    const errors = validateDraft("Форма", [
      newQuestionText(),
    ]);
    expect(errors).toEqual([]);
  });

  it("пустой текст вопроса", () => {
    const errors = validateDraft("Форма", [{ ...newQuestionText(), label: "" }]);
    expect(errors).toContain("Вопрос 1: пустой текст вопроса");
  });

  it("choice: меньше двух непустых вариантов", () => {
    const q = newQuestion("radio");
    q.label = "Курс";
    q.options = ["Первый", "   "];
    const errors = validateDraft("Форма", [q]);
    expect(errors).toContain("Вопрос 1: нужно минимум два непустых варианта ответа");
  });

  it("choice: повторяющиеся варианты", () => {
    const q = newQuestion("select");
    q.label = "Курс";
    q.options = ["Первый", "Первый"];
    const errors = validateDraft("Форма", [q]);
    expect(errors).toContain("Вопрос 1: варианты ответа повторяются");
  });

  it("несколько вопросов — в ошибках правильные номера", () => {
    const bad = newQuestion("checkbox");
    bad.label = "";
    const errors = validateDraft("Форма", [newQuestionText(), bad]);
    expect(errors).toContain("Вопрос 2: пустой текст вопроса");
  });

  function newQuestionText() {
    return { ...newQuestion("text"), label: "Имя" };
  }
});
