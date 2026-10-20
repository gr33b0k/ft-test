import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDbPath, readDB, writeDB } from "../db";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ft-db-"));
  process.env.DATA_FILE = path.join(tmpDir, "db.json");
});

afterEach(() => {
  delete process.env.DATA_FILE;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("getDbPath", () => {
  it("использует DATA_FILE из окружения", () => {
    expect(getDbPath()).toBe(path.join(tmpDir, "db.json"));
  });

  it("без DATA_FILE — путь на data/db.json", () => {
    const prev = process.env.DATA_FILE;
    delete process.env.DATA_FILE;
    expect(getDbPath()).toContain("db.json");
    process.env.DATA_FILE = prev;
  });
});

describe("readDB/writeDB", () => {
  it("отсутствующий файл — пустая база", () => {
    expect(readDB()).toEqual({ forms: [], attempts: [] });
  });

  it("roundtrip: запись и чтение", () => {
    const db = {
      forms: [
        {
          id: "f1",
          title: "Форма",
          questions: [],
          published: false,
          slug: "",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
      attempts: [],
    };
    writeDB(db);
    expect(readDB()).toEqual(db);
    // каталог создан при процессе записи
    expect(fs.existsSync(path.join(tmpDir, "db.json"))).toBe(true);
  });

  it("битый JSON переезжает в бэкап, база считается пустой", () => {
    const dbPath = path.join(tmpDir, "db.json");
    fs.writeFileSync(dbPath, "{ definitely not json", "utf-8");
    const read = readDB();
    expect(read).toEqual({ forms: [], attempts: [] });
    const leftovers = fs.readdirSync(tmpDir);
    expect(leftovers.some((f) => f.startsWith("db.json.corrupted-"))).toBe(true);
  });

  it("экспорт подмножеств полей: отсутствующие forms/attempts трактуются как пустые", () => {
    const dbPath = path.join(tmpDir, "db.json");
    fs.writeFileSync(dbPath, JSON.stringify({ foo: 1 }), "utf-8");
    expect(readDB()).toEqual({ forms: [], attempts: [] });
  });
});
