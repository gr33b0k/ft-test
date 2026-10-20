import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Form, Attempt } from "./models";

function defaultDbPath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../data/db.json",
  );
}

export function getDbPath(): string {
  return process.env.DATA_FILE || defaultDbPath();
}

interface DBData {
  forms: Form[];
  attempts: Attempt[];
}

function readDB(): DBData {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return { forms: [], attempts: [] };
  }
  const raw = fs.readFileSync(dbPath, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return { forms: parsed.forms ?? [], attempts: parsed.attempts ?? [] };
  } catch {
    const backup = `${dbPath}.corrupted-${Date.now()}`;
    fs.renameSync(dbPath, backup);
    console.error(`DB file was corrupted, moved to ${backup}`);
    return { forms: [], attempts: [] };
  }
}

function writeDB(data: DBData) {
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
}

export { readDB, writeDB };
