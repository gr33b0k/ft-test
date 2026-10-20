# AGENTS.md — правила работы для AI-агентов (OpenCode и др.)

## Обзор
Тестовое задание: сервис форм отклика (менеджер создаёт/публикует формы по ссылке, студенты заполняют).
Монорепо npm workspaces: `server/` (Express 5 + TS, tsx, ESM) и `client/` (React 19 + Vite 8/rolldown + Tailwind 4).
`AI_LOG.md` — журнал работы с AI; по заданию его нельзя удалять, он должен оставаться актуальным.

## Команды
- Запуск по заданию строго две команды из корня: `npm install` → `npm start` (concurrently поднимает оба сервиса, без прод-сборки).
- Порты из корневого `.env` (не коммитится; см. `.env.example`): `CLIENT_PORT=3000`, `SERVER_PORT=4000`. Vite проксирует `/api` на сервер.
- Тесты: `npm run test` (корень = client + server по очереди), по отдельности: `npm run test --prefix client`, `npm run test --prefix server`.
- Линт: `npm run lint --prefix client` (eslint). Build клиента: `npm run build --prefix client` (`tsc -b && vite build`).
- Typecheck сервера: `npm run typecheck` (корень) или `npx tsc -p server`. TypeScript ^7 (нативный tsgo); на слабых/изолированных средах при падении по числу процессов запускать с `GOMAXPROCS=1 npx tsc --noEmit -p server`.

## Сервер
- Сборка express-приложения — `server/app.ts` (`createApp()`), `index.ts` — только dotenv + PORT + listen. Тесты используют `createApp()` на эфемерном порту.
- БД — JSON-файл `data/db.json` (`/data/*.json` в .gitignore). Путь перекрывается env `DATA_FILE` (тесты пишут во временные каталоги). Битый JSON автоматически переезжает в `db.json.corrupted-<ts>`, база считается пустой.
- Роуты: `/api/forms` (админ, CRUD + publish/unpublish + attempts) и `/api/public/forms/:slug` (публичные формы + отправка попыток). Ошибки — `HttpError` из `validation.ts`, обрабатываются middleware в `app.ts`; 404-fallback отдаёт JSON.
- Слаг генерируется при публикации из названия с транслитерацией кириллицы в латиницу (`slugify` в `routes.ts`); при повторной публикации сохраняется.

## Клиент
- FSD-структура: `client/src/{app,pages,widgets,entities,features,shared}`; алиас `@` → `client/src` (vite + tsconfig).
- Тема — оранжевый бренд через Tailwind-токены `--color-brand-*` в `client/src/index.css` (использовать `bg-brand-600`, `text-brand-700` и т.п.).
- Иконки — только `lucide-react`; эмодзи в UI запрещены. Для иконок-кнопок использовать `Button` с пропом `icon` (важно: без него класс `p-0` спорит с базовыми `px-4 py-2` — в каскаде Tailwind выигрывает `px-4`, иконка исчезает).
- Общий UI — `shared/ui` (Button, Input/Field, CustomSelect, Badge/Chip, Alert, PageLoader...). Чистая логика выносится из компонентов в соседние `lib.ts`/`model.ts` и тестируется отдельно.

## Тесты (vitest 5, devDep в корне)
- Клиент: `client/src/**/*.test.ts` (конфиг `client/vitest.config.ts`), окружение node.
- Сервер: `server/tests/**/*.test.ts`; интеграционный `api.test.ts` поднимает приложение с временной БД через `DATA_FILE` — не трогает прод-данные.

## Конвенции работы
- Коммиты: Conventional Commits с русскими описаниями; **не коммитить и не пушить без явного подтверждения пользователя**.
- UI-тексты и сообщения об ошибках — на русском; user-facing формулировки важны (много уже написано — следовать существующему тону).

## Ловушки в изолированных средах (sandbox/spawn-ограничения)
- concurrently требует `ps`; если его нет — `npm start` падает на tree-kill. Это НЕ баг проекта: на обычных машинах работает; в песочнице проверять сервисы по отдельности (`npm run dev --prefix server` / `--prefix client`) или подготовить shim `ps`.
- Известный npm-bug с optional deps: после чистой переустановки esbuild/rolldown/oxide могут встать не под ту платформу (win32 вместо linux) — лечится `npm i --no-save @esbuild/linux-x64 @rolldown/binding-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu lightningcss-linux-x64-gnu` с версиями из lock, либо полной переустановкой.
