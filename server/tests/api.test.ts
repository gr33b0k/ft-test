import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import type { Express } from "express";
import type { Server } from "node:http";
import { createApp } from "../app";
import { type Question } from "../models";

const question: Question = {
  id: "q1",
  type: "text",
  label: "Как вас зовут?",
  required: true,
};

let app: Express;
let server: Server;
let baseUrl: string;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ft-api-"));
  process.env.DATA_FILE = path.join(tmpDir, "data.json");
  fs.writeFileSync(
    process.env.DATA_FILE,
    JSON.stringify({ forms: [], attempts: [] }),
    "utf-8",
  );
  app = createApp();
  server = app.listen(0);
  baseUrl = `http://localhost:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  delete process.env.DATA_FILE;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function get(path: string) {
  return fetch(baseUrl + path);
}

async function send(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  return fetch(baseUrl + path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("API /api/health", () => {
  it("отвечает ok", async () => {
    const res = await get("/api/health");
    expect(res.status).toBe(200);
    expect(await json<{ status: string }>(res)).toEqual({ status: "ok" });
  });
});

describe("API форм", () => {
  let formId: string;

  it("создаёт форму", async () => {
    const res = await send("POST", "/api/forms", {
      title: "Стажировка Frontend",
      questions: [question],
    });
    expect(res.status).toBe(201);
    const form = await json<{ id: string; [k: string]: unknown }>(res);
    expect(form.title).toBe("Стажировка Frontend");
    expect(form.published).toBe(false);
    expect(form.slug).toBe("");
    expect(form.questions).toHaveLength(1);
    formId = form.id;
  });

  it("список форм содержит созданную (сначала свежая)", async () => {
    const second = await send("POST", "/api/forms", {
      title: "Летний оффер",
      questions: [question],
    });
    expect(second.status).toBe(201);
    const list = (await (await get("/api/forms")).json()) as {
      id: string;
      createdAt: string;
    }[];
    expect(list.map((f) => f.id)).toContain(formId);
    expect(list[0].id).toBe((await json<{ id: string }>(second)).id);
  });

  it("404 у несуществовавшей формы", async () => {
    const res = await get("/api/forms/no-such-id");
    expect(res.status).toBe(404);
    expect((await json<{ error: string }>(res)).error).toBe("Форма не найдена");
  });

  it("редактирование формы", async () => {
    const res = await send("PUT", `/api/forms/${formId}`, {
      title: "Стажировка Frontend 2026",
      description: "Обновлено",
      questions: [question],
    });
    expect(res.status).toBe(200);
    const form = await json<{ id: string; [k: string]: unknown }>(res);
    expect(form.title).toBe("Стажировка Frontend 2026");
    expect(form.description).toBe("Обновлено");
  });

  it("публикация генерирует латинский слаг", async () => {
    const res = await send("POST", `/api/forms/${formId}/publish`);
    expect(res.status).toBe(200);
    const form = await json<{ id: string; [k: string]: unknown }>(res);
    expect(form.published).toBe(true);
    expect(form.slug).toBe("stazhirovka-frontend-2026");
  });

  it("двойная публикация сохраняет слаг", async () => {
    const again = await send("POST", `/api/forms/${formId}/publish`);
    expect((await json<{ slug: string }>(again)).slug).toBe("stazhirovka-frontend-2026");
  });

  it("публичный роут отдаёт опубликованную форму", async () => {
    const res = await get("/api/public/forms/stazhirovka-frontend-2026");
    expect(res.status).toBe(200);
    expect((await json<{ title: string }>(res)).title).toBe("Стажировка Frontend 2026");
  });

  it("публичный роут 404 для неопубликованных/несуществующих", async () => {
    const missing = await get("/api/public/forms/netTakoi");
    expect(missing.status).toBe(404);
  });

  it("отправка попытки на публичной форме", async () => {
    const res = await send("POST", "/api/public/forms/stazhirovka-frontend-2026/attempts", {
      answers: [{ questionId: "q1", value: "Аня" }],
    });
    expect(res.status).toBe(201);
    const attempt = await json<{ status: string; answers: { value: string }[] }>(res);
    expect(attempt.status).toBe("submitted");
    expect(attempt.answers[0].value).toBe("Аня");
  });

  it("валидация попытки: обязательный пропущен", async () => {
    const res = await send("POST", "/api/public/forms/stazhirovka-frontend-2026/attempts", {
      answers: [],
    });
    expect(res.status).toBe(400);
    const body = await json<{ details?: unknown[] }>(res);
    expect(Array.isArray(body.details)).toBe(true);
  });

  it("список попыток для формы", async () => {
    const res = await get(`/api/forms/${formId}/attempts`);
    expect(res.status).toBe(200);
    const attempts = await json<unknown[]>(res);
    expect(attempts).toHaveLength(1);
  });

  describe("черновой прогресс (started attempt)", () => {
    const SLUG = "/api/public/forms/stazhirovka-frontend-2026";

    let draftId: string;

    it("start создаёт started-попытку, невалидные варианты отбрасываются", async () => {
      const res = await send("POST", `${SLUG}/attempts/start`, {
        answers: [{ questionId: "q9-ghost", value: "x" }],
      });
      expect(res.status).toBe(201);
      const attempt = await json<{ id: string; status: string; answers: unknown[] }>(res);
      expect(attempt.status).toBe("started");
      expect(attempt.answers).toEqual([]);
      draftId = attempt.id;
    });

    it("PUT обновляет ответы; пустые и вне-Variantов не сохраняются", async () => {
      const res = await send("PUT", `${SLUG}/attempts/${draftId}`, {
        answers: [{ questionId: "q1", value: "Марк" }],
      });
      expect(res.status).toBe(200);
      const attempt = await json<{ answers: { questionId: string; value: string }[] }>(res);
      expect(attempt.answers).toEqual([{ questionId: "q1", value: "Марк" }]);
    });

    it("PUT к существующей отправленной попытке — 404", async () => {
      const submitted = await send("POST", `${SLUG}/attempts`, {
        answers: [{ questionId: "q1", value: "Аня" }],
      });
      const submittedId = (await json<{ id: string }>(submitted)).id;
      const res = await send("PUT", `${SLUG}/attempts/${submittedId}`, {
        answers: [],
      });
      expect(res.status).toBe(404);
    });

    it("submit с attemptId завершает черновик (200, статус submitted)", async () => {
      const res = await send("POST", `${SLUG}/attempts`, {
        answers: [{ questionId: "q1", value: "Марк" }],
        attemptId: draftId,
      });
      expect(res.status).toBe(200);
      const attempt = await json<{ id: string; status: string }>(res);
      expect(attempt.id).toBe(draftId);
      expect(attempt.status).toBe("submitted");
    });

    it("start на неопубликованной форме — 404", async () => {
      const res = await send("POST", "/api/public/forms/netTakoi/attempts/start", {
        answers: [],
      });
      expect(res.status).toBe(404);
    });

    it("GET черновика по id возвращается (восстановление прогресса)", async () => {
      const start = await send("POST", `${SLUG}/attempts/start`, {
        answers: [{ questionId: "q1", value: "Даша" }],
      });
      const draft = await json<{ id: string }>(start);
      const fetched = await get(`${SLUG}/attempts/${draft.id}`);
      expect(fetched.status).toBe(200);
      const attempt = await json<{ status: string; answers: { value: string }[] }>(fetched);
      expect(attempt.status).toBe("started");
      expect(attempt.answers[0].value).toBe("Даша");
    });
  });

  it("снятие с публикации закрывает публичный доступ", async () => {
    const unpublish = await send("POST", `/api/forms/${formId}/unpublish`);
    expect(unpublish.status).toBe(200);
    expect((await json<{ published: boolean }>(unpublish)).published).toBe(false);
    const gone = await get("/api/public/forms/stazhirovka-frontend-2026");
    expect(gone.status).toBe(404);
  });

  it("публикация формы без вопросов невозможна", async () => {
    const created = await send("POST", "/api/forms", { title: "Пустая", questions: [] });
    const id = (await json<{ id: string }>(created)).id;
    const res = await send("POST", `/api/forms/${id}/publish`);
    expect(res.status).toBe(400);
    expect((await json<{ error: string }>(res)).error).toBe("Нельзя опубликовать форму без вопросов");
  });

  it("удаление формы чистит и её попытки", async () => {
    const res = await send("DELETE", `/api/forms/${formId}`);
    expect(res.status).toBe(204);
    expect((await get(`/api/forms/${formId}/attempts`)).status).toBe(404);
    const list = await get("/api/forms");
    expect((await json<{ id: string }[]>(list)).some((f) => f.id === formId)).toBe(false);
  });
});

describe(" невалидные payload-ы и прочее", () => {
  it("400 при JSON-мусоре в теле", async () => {
    const res = await fetch(baseUrl + "/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ nope",
    });
    expect(res.status).toBe(400);
  });

  it("неизвестный маршрут отдаёт JSON 404", async () => {
    const res = await get("/api/whatever");
    expect(res.status).toBe(404);
    expect((await json<{ error: string }>(res)).error).toBe("Маршрут не найден");
  });
});
