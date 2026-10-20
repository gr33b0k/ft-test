import { describe, expect, it } from "vitest";
import { formatDateTime } from "./format";

describe("formatDateTime", () => {
  it("форматирует дату в ru-RU", () => {
    const formatted = formatDateTime("2026-02-02T10:30:00Z");
    // день-месяц-год + время; конкретизируем только стабильные части
    expect(formatted).toContain("2026");
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });

  it("переносит произвольные ISO-строки без исключений", () => {
    expect(() => formatDateTime("2020-12-31T23:59:59.999Z")).not.toThrow();
  });
});
