import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  answersFromAttempt,
  attemptStorageKey,
  clearSavedAttempt,
  createProgressSaver,
  readSavedAttemptId,
  saveAttemptId,
} from "./model";
import { type Attempt } from "@/entities/form/model";

// окружение node: подставляем фейковое окно с localStorage
const storageMem = new Map<string, string>();
beforeAll(() => {
  (globalThis as { window?: unknown }).window = {
    location: { origin: "http://test" },
    localStorage: {
      getItem: (k: string) => storageMem.get(k) ?? null,
      setItem: (k: string, v: string) => storageMem.set(k, v),
      removeItem: (k: string) => storageMem.delete(k),
    },
  };
});
afterAll(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("хранилище черновика", () => {
  beforeEach(() => {
    storageMem.clear();
  });

  it("ключ зависит от id формы", () => {
    expect(attemptStorageKey("f1")).toBe("futureforms:started-attempt:f1");
  });

  it("save → read → clear", () => {
    saveAttemptId("f1", "a1");
    expect(readSavedAttemptId("f1")).toBe("a1");
    expect(readSavedAttemptId("f2")).toBeNull();
    clearSavedAttempt("f1");
    expect(readSavedAttemptId("f1")).toBeNull();
  });

  it("answersFromAttempt разворачивает список ответов в карту", () => {
    const attempt = {
      id: "a1",
      formId: "f1",
      status: "started" as const,
      createdAt: "2026-01-01T00:00:00Z",
      answers: [
        { questionId: "q1", value: "Имя" },
        { questionId: "q2", value: ["React", "Vue"] },
      ],
    } as Attempt;
    expect(answersFromAttempt(attempt)).toEqual({
      q1: "Имя",
      q2: ["React", "Vue"],
    });
  });
});

describe("createProgressSaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeSaver(state: { started: boolean }) {
    const starts: unknown[][] = [];
    const updates: unknown[][] = [];
    const saver = createProgressSaver({
      hasStarted: () => state.started,
      onStart: async (answers) => {
        starts.push(answers)
      },
      onUpdate: async (answers) => {
        updates.push(answers)
      },
      delay: 500,
    });
    return { saver, starts, updates };
  }

  it("save дебаунсится: один вызов на пачку изменений", async () => {
    const { saver, starts, updates } = makeSaver({ started: false });
    saver.save([{ questionId: "q1", value: "1" }]);
    saver.save([{ questionId: "q1", value: "12" }]);
    saver.save([{ questionId: "q1", value: "123" }]);
    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();
    expect(starts).toHaveLength(1);
    expect((starts[0][0] as { value: string }).value).toBe("123");
    expect(updates).toHaveLength(0);
  });

  it("после первого сохранения следующий слепок уходит в onUpdate", async () => {
    const state = { started: false };
    const { saver, starts, updates } = makeSaver(state);
    saver.save([{ questionId: "q1", value: "1" }]);
    await vi.runAllTimersAsync();
    expect(starts).toHaveLength(1);

    // период сохранения был постоянным — переключение делает hasStarted
    state.started = true;
    saver.save([{ questionId: "q1", value: "2" }]);
    await vi.runAllTimersAsync();
    expect(updates).toHaveLength(1);
  });

  it("flush сохраняет немедленно и дожидается записи", async () => {
    const { saver, starts } = makeSaver({ started: false });
    saver.save([{ questionId: "q1", value: "x" }]);
    await saver.flush();
    expect(starts).toHaveLength(1);
    // больше не должно затраться
    await vi.runAllTimersAsync();
    expect(starts).toHaveLength(1);
  });

  it("cancel отбрасывает отложенный сейв", async () => {
    const { saver, starts } = makeSaver({ started: false });
    saver.save([{ questionId: "q1", value: "x" }]);
    saver.cancel();
    await vi.runAllTimersAsync();
    expect(starts).toHaveLength(0);
  });
});
