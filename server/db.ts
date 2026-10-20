import fs from "fs";
import path from "path";
import { Form, Attempt } from "./models";

const DB_PATH = path.join(__dirname, "../data/db.json");

interface DBData {
  forms: Form[];
  attempts: Attempt[];
}

function readDB(): DBData {
  if (!fs.existsSync(DB_PATH)) {
    return { forms: [], attempts: [] };
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDB(data: DBData) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export { readDB, writeDB, DB_PATH };
