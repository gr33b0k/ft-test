import { describe, expect, it } from "vitest";
import {
  buildConversion,
  buildDailyActivity,
  buildOptionCounts,
  pluralizeAnswers,
  splitByStatus,
} from "./lib";
import { type Attempt, type Form } from "@/entities/form/model";

function attempt(
  id: string,
  status: Attempt["status"],
  createdAt: string,
  answers: Attempt["answers"] = [],
): Attempt {
  return { id, formId: "f1", answers, status, createdAt };
}

const choiceForm: Form = {
  id: "f1",
  title: "Форма",
  questions: [
    { id: "q1", type: "text", label: "Имя", required: true },
    { id: "q2", type: "radio", label: "Курс", options: ["2", "3", "4"], required: true },
  ],
  published: true,
  slug: "forma",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("splitByStatus", () => {
  it("делит попытки по статусам", () => {
    const attempts = [
      attempt("a1", "submitted", "2026-05-01T10:00:00Z"),
      attempt("a2", "started", "2026-05-01T11:00:00Z"),
      attempt("a3", "submitted", "2026-05-02T09:00:00Z"),
    ];
    const { started, submitted } = splitByStatus(attempts);
    expect(started.map((a) => a.id)).toEqual(["a2"]);
    expect(submitted.map((a) => a.id)).toEqual(["a1", "a3"]);
  });
});

describe("buildOptionCounts", () => {
  it("считает только по данным попыткам; checkbox-ответ — вес 1 за отметку", () => {
    const counts = buildOptionCounts(choiceForm, [
      attempt("a1", "submitted", "2026-05-01T10:00:00Z", [
        { questionId: "q1", value: "Аня" },
        { questionId: "q2", value: "2" },
      ]),
      attempt("a2", "submitted", "2026-05-02T10:00:00Z", [
        { questionId: "q2", value: "2" },
      ]),
    ]);
    const radio = counts.find(({ question }) => question.id === "q2")!;
    expect(radio.total).toBe(2);
    expect(radio.counts[0]).toEqual({ option: "2", count: 2 });
    const text = counts.find(({ question }) => question.id === "q1")!;
    expect(text.counts).toEqual([]);
  });

  it("radio/select вне вариантов не считаются", () => {
    const counts = buildOptionCounts(choiceForm, [
      attempt("a1", "submitted", "2026-05-01T10:00:00Z", [{ questionId: "q2", value: "не-вариант" }]),
    ]);
    expect(counts.find(({ question }) => question.id === "q2")!.total).toBe(0);
  });
});

describe("buildConversion", () => {
  it("конверсия = submitted / (started + submitted)", () => {
    const stats = buildConversion([
      attempt("a1", "submitted", "2026-05-01T10:00:00Z"),
      attempt("a2", "submitted", "2026-05-01T11:00:00Z"),
      attempt("a3", "started", "2026-05-01T12:00:00Z"),
      attempt("a4", "started", "2026-05-01T13:00:00Z"),
      attempt("a5", "started", "2026-05-01T14:00:00Z"),
    ]);
    expect(stats).toEqual({ startedCount: 3, submittedCount: 2, rate: 0.4 });
  });

  it("пустые данные — rate 0", () => {
    expect(buildConversion([])).toEqual({ startedCount: 0, submittedCount: 0, rate: 0 });
  });
});

describe("buildDailyActivity", () => {
  it("отдаёт ровно 14 дней от now назад, старые отправки не попадают", () => {
    const now = new Date(2026, 4, 10, 12, 0); // локально 10 мая
    const sameDay = new Date(2026, 4, 10, 3, 15);
    const fresh = new Date(2026, 4, 8, 20, 0);
    const stale = new Date(2026, 3, 1); // апрель — за пределами окна
    const activity = buildDailyActivity(
      [
        attempt("a1", "submitted", sameDay.toISOString()),
        attempt("a2", "submitted", fresh.toISOString()),
        attempt("a3", "submitted", stale.toISOString()),
        attempt("a4", "started", sameDay.toISOString()), // незавершённые не считаются
      ],
      now,
    );
    expect(activity).toHaveLength(14);
    // последний элемент — сегодняшний день
    expect(activity[13].date).toBe("2026-05-10");
    expect(activity[13].count).toBe(1);
    expect(activity.find((d) => d.date === "2026-05-08")?.count).toBe(1);
    // массив от старых к новым
    expect(activity[0].date).toBe("2026-04-27");
  });

  it("день без отправок имеет count 0", () => {
    const now = new Date(2026, 4, 10, 12, 0);
    const activity = buildDailyActivity([], now);
    expect(activity.every((d) => d.count === 0)).toBe(true);
    // локальные подписи с коротким месяцем
    expect(activity[13].label).toBe("10 мая");
  });
});

describe("pluralizeAnswers", () => {
  it("склоняет по правилам русского языка", () => {
    expect(pluralizeAnswers(1)).toBe("ответ");
    expect(pluralizeAnswers(2)).toBe("ответа");
    expect(pluralizeAnswers(4)).toBe("ответа");
    expect(pluralizeAnswers(5)).toBe("ответов");
    expect(pluralizeAnswers(11)).toBe("ответов");
    expect(pluralizeAnswers(21)).toBe("ответ");
    expect(pluralizeAnswers(101)).toBe("ответ");
  });
});
