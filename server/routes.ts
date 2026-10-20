import { Router } from "express";
import { Form } from "./models";
import { readDB, writeDB } from "./db";
import { HttpError, parseFormPayload, parseAttemptPayload, checkAttempt } from "./validation";

function nowISO(): string {
  return new Date().toISOString();
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
  ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shh",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  і: "i", ї: "yi", є: "e", ґ: "g", ў: "u",
};

function transliterate(text: string): string {
  return [...text.toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join("");
}

export function slugify(title: string): string {
  return transliterate(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateSlug(title: string, forms: Form[]): string {
  const existing = new Set(forms.map((f) => f.slug));
  const base = slugify(title) || "form";
  let slug = base;
  let suffix = 1;
  while (existing.has(slug)) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

function getFormOrFail(forms: Form[], id: string): Form {
  const form = forms.find((f) => f.id === id);
  if (!form) {
    throw new HttpError(404, "Форма не найдена");
  }
  return form;
}

export const adminRouter = Router();

adminRouter.get("/", (_req, res) => {
  const forms = [...readDB().forms].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(forms);
});

adminRouter.post("/", (req, res) => {
  const payload = parseFormPayload(req.body);
  const db = readDB();
  const form: Form = {
    id: crypto.randomUUID(),
    title: payload.title,
    description: payload.description,
    questions: payload.questions,
    published: false,
    slug: "",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  db.forms.push(form);
  writeDB(db);
  res.status(201).json(form);
});

adminRouter.get("/:id", (req, res) => {
  const form = getFormOrFail(readDB().forms, req.params.id);
  res.json(form);
});

adminRouter.put("/:id", (req, res) => {
  const payload = parseFormPayload(req.body);
  const db = readDB();
  const form = getFormOrFail(db.forms, req.params.id);
  form.title = payload.title;
  form.description = payload.description;
  form.questions = payload.questions;
  form.updatedAt = nowISO();
  writeDB(db);
  res.json(form);
});

adminRouter.delete("/:id", (req, res) => {
  const db = readDB();
  const index = db.forms.findIndex((f) => f.id === req.params.id);
  if (index === -1) {
    throw new HttpError(404, "Форма не найдена");
  }
  db.forms.splice(index, 1);
  db.attempts = db.attempts.filter((a) => a.formId !== req.params.id);
  writeDB(db);
  res.status(204).send();
});

adminRouter.post("/:id/publish", (req, res) => {
  const db = readDB();
  const form = getFormOrFail(db.forms, req.params.id);
  if (form.questions.length === 0) {
    throw new HttpError(400, "Нельзя опубликовать форму без вопросов");
  }
  form.published = true;
  if (!form.slug) {
    form.slug = generateSlug(form.title, db.forms);
  }
  form.updatedAt = nowISO();
  writeDB(db);
  res.json(form);
});

adminRouter.post("/:id/unpublish", (req, res) => {
  const db = readDB();
  const form = getFormOrFail(db.forms, req.params.id);
  form.published = false;
  form.updatedAt = nowISO();
  writeDB(db);
  res.json(form);
});

adminRouter.get("/:id/attempts", (req, res) => {
  getFormOrFail(readDB().forms, req.params.id);
  const attempts = readDB()
    .attempts.filter((a) => a.formId === req.params.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(attempts);
});

export const publicRouter = Router();

publicRouter.get("/:slug", (req, res) => {
  const form = readDB().forms.find((f) => f.slug === req.params.slug && f.published);
  if (!form) {
    throw new HttpError(404, "Форма не найдена или ещё не опубликована");
  }
  res.json(form);
});

publicRouter.get("/:slug/attempts/:attemptId", (req, res) => {
  const attempt = readDB().attempts.find((a) => a.id === req.params.attemptId);
  const form = readDB().forms.find((f) => f.slug === req.params.slug && f.published);
  if (!attempt || !form || attempt.formId !== form.id) {
    throw new HttpError(404, "Отправка не найдена");
  }
  res.json(attempt);
});

publicRouter.post("/:slug/attempts", (req, res) => {
  const db = readDB();
  const form = db.forms.find((f) => f.slug === req.params.slug && f.published);
  if (!form) {
    throw new HttpError(404, "Форма не найдена или ещё не опубликована");
  }
  const answers = parseAttemptPayload(req.body);
  const checked = checkAttempt(form, answers);
  const attempt = {
    id: crypto.randomUUID(),
    formId: form.id,
    answers: checked,
    status: "submitted" as const,
    createdAt: nowISO(),
  };
  db.attempts.push(attempt);
  writeDB(db);
  res.status(201).json(attempt);
});
