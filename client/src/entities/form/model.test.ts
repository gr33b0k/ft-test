import { describe, expect, it } from "vitest";
import {
  QUESTION_TYPES,
  isChoiceType,
  publicFormUrl,
} from "./model";

describe("isChoiceType", () => {
  it("true для select/checkbox/radio", () => {
    expect(isChoiceType("select")).toBe(true);
    expect(isChoiceType("checkbox")).toBe(true);
    expect(isChoiceType("radio")).toBe(true);
  });

  it("false для text", () => {
    expect(isChoiceType("text")).toBe(false);
  });
});

describe("QUESTION_TYPES", () => {
  it("покрывает все 4 типа", () => {
    expect(QUESTION_TYPES).toEqual(["text", "select", "checkbox", "radio"]);
  });
});

describe("publicFormUrl", () => {
  it("строит ссылку на публичную форму из origin окна", () => {
    const prevWindow = globalThis.window;
    // в окружении node window отсутствует — подставляем фейк
    (globalThis as { window?: unknown }).window = {
      location: { origin: "https://careers.example" },
    };
    try {
      expect(publicFormUrl("stazhirovka-frontend")).toBe(
        "https://careers.example/f/stazhirovka-frontend",
      );
    } finally {
      if (prevWindow === undefined) delete (globalThis as { window?: unknown }).window;
      else (globalThis as { window?: unknown }).window = prevWindow;
    }
  });
});
