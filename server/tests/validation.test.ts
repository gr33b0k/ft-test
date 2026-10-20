import { describe, expect, it } from "vitest";
import {
  HttpError,
  checkAttempt,
  parseAttemptPayload,
  parseFormPayload,
  validateQuestions,
} from "../validation";
import { type Form, type Question } from "../models";

const textQ: Question = {
  id: "q1",
  type: "text",
  label: "Имя",
  required: false,
};

const radioQ: Question = {
  id: "q2",
  type: "radio",
  label: "Курс",
  options: ["2", "3"],
  required: true,
};

const checkboxQ: Question = {
  id: "q3",
  type: "checkbox",
  label: "Навыки",
  options: ["React", "Vue"],
  required: false,
};

function makeForm(questions: Question[], overrides: Partial<Form> = {}): Form {
  return {
    id: "f1",
    title: "Тест",
    questions,
    published: true,
    slug: "test",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function expectHttpError(fn: () => unknown, status: number, message?: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    const err = e as HttpError;
    expect(err.status).toBe(status);
    if (message) expect(err.message).toBe(message);
    return;
  }
  throw new Error("Ожидался HttpError, но его не было");
}

describe("validateQuestions", () => {
  it("принимает корректные вопросы и триммит label/options", () => {
    const result = validateQuestions(
      [
        { type: "text", label: "  Имя  ", required: false },
        { type: "radio", label: "Курс", required: true, options: [" 2 ", "3 "] },
      ],
      { partial: false },
    );
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("Имя");
    expect(result[1].options).toEqual(["2", "3"]);
  });

  it("кикает не-массив", () => {
    expectHttpError(
      () => validateQuestions("nope", { partial: false }),
      400,
      "questions должен быть массивом",
    );
  });

  it("partial=true требует минимум один вопрос", () => {
    expectHttpError(
      () => validateQuestions([], { partial: true }),
      400,
      "форма должна содержать хотя бы один вопрос",
    );
  });

  it("partial=false разрешает пустой список (черновик)", () => {
    expect(validateQuestions([], { partial: false })).toEqual([]);
  });

  it("неизвестный тип вопроса", () => {
    expectHttpError(
      () =>
        validateQuestions([{ type: "rating", label: "x", required: false }], {
          partial: false,
        }),
      400,
    );
  });

  it("пустой label", () => {
    expectHttpError(
      () =>
        validateQuestions([{ type: "text", label: "   ", required: false }], {
          partial: false,
        }),
      400,
    );
  });

  it("required не boolean", () => {
    expectHttpError(
      () =>
        validateQuestions([{ type: "text", label: "x", required: "да" }], {
          partial: false,
        }),
      400,
    );
  });

  it("у choice-вопросов нужно минимум 2 уникальных варианта", () => {
    expectHttpError(
      () =>
        validateQuestions(
          [{ type: "select", label: "x", required: false, options: ["A"] }],
          { partial: false },
        ),
      400,
    );
    expectHttpError(
      () =>
        validateQuestions(
          [{ type: "select", label: "x", required: false, options: ["A", " A"] }],
          { partial: false },
        ),
      400,
    );
    expectHttpError(
      () =>
        validateQuestions(
          [{ type: "radio", label: "x", required: false }],
          { partial: false },
        ),
      400,
    );
  });

  it("ошибка содержит индекс первого проблемного вопроса", () => {
    expectHttpError(
      () =>
        validateQuestions(
          [
            { type: "text", label: "ok", required: false },
            { type: "chto-to", label: "x", required: true },
          ],
          { partial: false },
        ),
      400,
    );
  });
});

describe("parseFormPayload", () => {
  it("валидирует payload формы", () => {
    const payload = parseFormPayload({ title: "  Моя форма  ", questions: [] });
    expect(payload.title).toBe("Моя форма");
    expect(payload.questions).toEqual([]);
  });

  it("description опционален и должен быть строкой", () => {
    expect(
      parseFormPayload({ title: "x", questions: [], description: "d" })
        .description,
    ).toBe("d");
    expectHttpError(
      () => parseFormPayload({ title: "x", questions: [], description: 42 }),
      400,
      "description: должна быть строкой",
    );
  });

  it("отсутствие или пустой title", () => {
    expectHttpError(
      () => parseFormPayload({ questions: [] }),
      400,
      "title: обязательное непустое поле",
    );
    expectHttpError(
      () => parseFormPayload({ title: "   ", questions: [] }),
      400,
      "title: обязательное непустое поле",
    );
  });

  it("не объект", () => {
    expectHttpError(() => parseFormPayload("x"), 400, "Ожидается JSON-объект");
    expectHttpError(() => parseFormPayload(null), 400, "Ожидается JSON-объект");
    expectHttpError(() => parseFormPayload([]), 400, "Ожидается JSON-объект");
  });
});

describe("parseAttemptPayload", () => {
  it("принимает массив answers", () => {
    expect(
      parseAttemptPayload({
        answers: [
          { questionId: "q1", value: "text" },
          { questionId: "q2", value: ["a", "b"] },
        ],
      }),
    ).toEqual([
      { questionId: "q1", value: "text" },
      { questionId: "q2", value: ["a", "b"] },
    ]);
  });

  it("кикает не-объект / не-массив answers", () => {
    expectHttpError(
      () => parseAttemptPayload(null),
      400,
      "Ожидается JSON-объект с массивом answers",
    );
    expectHttpError(
      () => parseAttemptPayload({ answers: "no" }),
      400,
      "Ожидается JSON-объект с массивом answers",
    );
  });

  it("элементы должны иметь questionId и строковое value", () => {
    expectHttpError(
      () => parseAttemptPayload({ answers: [{ value: "x" }] }),
      400,
    );
    expectHttpError(
      () => parseAttemptPayload({ answers: [{ questionId: "q", value: 1 }] }),
      400,
    );
    expectHttpError(
      () =>
        parseAttemptPayload({ answers: [{ questionId: "q", value: [1] }] }),
      400,
    );
  });
});

describe("checkAttempt", () => {
  it("валидная отправка: text триммится, radio из options, checkbox массив", () => {
    const checked = checkAttempt(makeForm([textQ, radioQ, checkboxQ]), [
      { questionId: "q1", value: "  Иван  " },
      { questionId: "q2", value: "2" },
      { questionId: "q3", value: ["React"] },
    ]);
    expect(checked).toEqual([
      { questionId: "q1", value: "Иван" },
      { questionId: "q2", value: "2" },
      { questionId: "q3", value: ["React"] },
    ]);
  });

  it("пропущен обязательный вопрос", () => {
    expectHttpError(
      () =>
        checkAttempt(makeForm([textQ, radioQ]), [{ questionId: "q1", value: "Иван" }]),
      400,
    );
  });

  it("необязательный пустой текст просто отбрасывается", () => {
    expect(
      checkAttempt(makeForm([textQ]), [{ questionId: "q1", value: "   " }]),
    ).toEqual([]);
  });

  it("checkbox не массив — ошибка", () => {
    expectHttpError(
      () =>
        checkAttempt(makeForm([checkboxQ]), [{ questionId: "q3", value: "React" }]),
      400,
    );
  });

  it("checkbox: недопустимые варианты перечислены в ошибке", () => {
    try {
      checkAttempt(makeForm([checkboxQ]), [
        { questionId: "q3", value: ["React", "Svelte"] },
      ]);
      throw new Error("ожидался throw");
    } catch (e) {
      expect((e as HttpError).details?.[0]).toContain("Svelte");
    }
  });

  it("radio: значение вне вариантов — ошибка", () => {
    expectHttpError(
      () => checkAttempt(makeForm([radioQ]), [{ questionId: "q2", value: "9" }]),
      400,
    );
  });

  it("дублирующиеся ответы на один вопрос", () => {
    expectHttpError(
      () =>
        checkAttempt(makeForm([textQ]), [
          { questionId: "q1", value: "a" },
          { questionId: "q1", value: "b" },
        ]),
      400,
    );
  });

  it("ответы на несуществующие вопросы", () => {
    try {
      checkAttempt(makeForm([textQ]), [{ questionId: "ghost", value: "x" }]);
      throw new Error("ожидался throw");
    } catch (e) {
      expect((e as HttpError).details?.[0]).toContain("ghost");
    }
  });

  it("required checkbox с пустым массивом — ошибка", () => {
    const requiredCb: Question = { ...checkboxQ, required: true };
    expectHttpError(
      () =>
        checkAttempt(makeForm([requiredCb]), [{ questionId: "q3", value: [] }]),
      400,
    );
  });
});
