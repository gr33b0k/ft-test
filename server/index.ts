import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { adminRouter, publicRouter } from "./routes";
import { HttpError } from "./validation";

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
});

const app = express();
const PORT = Number(process.env.SERVER_PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/forms", adminRouter);
app.use("/api/public/forms", publicRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден", path: req.originalUrl });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, details: err.details });
      return;
    }
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "Некорректный JSON в теле запроса" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  },
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
