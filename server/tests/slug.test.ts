import { describe, expect, it } from "vitest";
import { generateSlug, slugify } from "../routes";

describe("slugify", () => {
  it("транслитерирует кириллицу в латиницу", () => {
    expect(slugify("Форма отклика на стажировку")).toBe(
      "forma-otklika-na-stazhirovku",
    );
    expect(slugify("Стажировка")).toBe("stazhirovka");
    expect(slugify("Ёж Ъ Ы Э Ю Я")).toBe("yozh-y-e-yu-ya");
  });

  it("сливает служебные символы в один дефис", () => {
    expect(slugify("Reisebüro résUMé — 北京!")).toBe("reiseb-ro-r-sum");
  });

  it("дефисы-краплики убираются по краям", () => {
    expect(slugify("--Привет мир--")).toBe("privet-mir");
  });

  it("возвращает пустую строку для символов вне латиницы", () => {
    expect(slugify("日本語")).toBe("");
    expect(slugify("")).toBe("");
    expect(slugify("[]")).toBe("");
  });
});

describe("generateSlug", () => {
  it("фоллбэк на 'form', если из названия ничего не извлеклось", () => {
    expect(generateSlug("日本語", [])).toBe("form");
  });

  it("разруливает коллизии суффиксами", () => {
    const forms = [{ slug: "forma" }, { slug: "forma-1" }] as never[];
    expect(generateSlug("Форма", forms)).toBe("forma-2");
  });

  it("оставляет базовый слаг, если он свободен", () => {
    expect(generateSlug("Форма", [])).toBe("forma");
  });
});
