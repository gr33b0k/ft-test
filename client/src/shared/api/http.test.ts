import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, del, get, post, put, request } from "./http";

function jsonResponse(
  status: number,
  body: unknown,
  statusText = "",
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("успешный ответ парсится в JSON и добавляет базовый префикс /api", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await request("/forms");
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/forms");
    expect((init as RequestInit).headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("сетевой сбой → ApiError со статусом 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(request("/forms")).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      message: "Не удалось связаться с сервером",
    });
  });

  it("ошибка сервера с JSON-телом → message/details из body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(400, { error: "Проверьте ответы", details: ["Вопрос 1"] }),
      ),
    );
    await expect(request("/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Проверьте ответы",
      details: ["Вопрос 1"],
    });
  });

  it("ошибка с не-JSON телом → стандартный statusText", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
      } as unknown as Response),
    );
    await expect(request("/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "Internal Server Error",
    });
  });

  it("204 → undefined без попытки парсить JSON", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error("не должно вызваться")),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchSpy);
    await expect(request("/x")).resolves.toBeUndefined();
  });
});

describe("методы-обёртки", () => {
  it("post сериализует body и ставит Content-Type", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(201, { id: 1 }));
    vi.stubGlobal("fetch", fetchSpy);
    await post("/forms", { title: "x" });
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ title: "x" }));
  });

  it("post без body отправляет undefined body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchSpy);
    await post("/x");
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("put сериализует body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchSpy);
    await put("/forms/1", { title: "y" });
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify({ title: "y" }));
  });

  it("del — DELETE без тела", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(204, undefined));
    vi.stubGlobal("fetch", fetchSpy);
    await del("/forms/1");
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("get — просто request", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchSpy);
    await get("/forms");
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/forms");
  });
});

describe("ApiError", () => {
  it("хранит статус/детали", () => {
    const err = new ApiError(418, "пиалка", ["де", "ль"]);
    expect(err.status).toBe(418);
    expect(err.message).toBe("пиалка");
    expect(err.details).toEqual(["де", "ль"]);
    expect(err.name).toBe("ApiError");
  });
});
