import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Form, Attempt } from "./models";

const DB_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/db.json",
);

interface DBData {
  forms: Form[];
  attempts: Attempt[];
}

function readDB(): DBData {
  if (!fs.existsSync(DB_PATH)) {
    return { forms: [], attempts: [] };
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return { forms: parsed.forms ?? [], attempts: parsed.attempts ?? [] };
  } catch {
    const backup = `${DB_PATH}.corrupted-${Date.now()}`;
    fs.renameSync(DB_PATH, backup);
    console.error(`DB file was corrupted, moved to ${backup}`);
    return { forms: [], attempts: [] };
  }
}

function writeDB(data: DBData) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export { readDB, writeDB, DB_PATH };