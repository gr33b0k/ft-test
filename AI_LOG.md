# Лог работы с AI

Работа над сервисом форм выполнялась совместно с AI (opencode / GLM). Хронология решений:

## Этап 1. Исследование

- Изучена структура: корень (concurrently), `server/` (Express 5 + tsx), `client/` (Vite + React 19, шаблон без изменений).
- Выяснено: API реализован только `GET /api/health`; модели (`Form`, `Question`, `Attempt`) определены, но не подключены; клиенту было не к чему обращаться.
- Найдена проблема сборки сервера: tsconfig `module: commonjs` при `"type": "module"`; `__dirname` в `db.ts` несовместим с ESM.

## Этап 2. Принятые архитектурные решения (согласованы с пользователем)

- Запуск без сборки: `npm install` → `npm start` (concurrently поднимает server + client).
- Клиент на порту `CLIENT_PORT` (3000) из корневого `.env`, сервер на `SERVER_PORT` (4000), запросы `/api` проксируются через Vite.
- Стили — Tailwind CSS 4 (плагин `@tailwindcss/vite`).
- Сервер дописывается: роуты форм/attempts, валидация, обработка ошибок, сид-форма.

## Этап 3. Сервер

- `db.ts`: переход на `import.meta.dirname`, защита от битого `db.json` (backup + чистая база), сид-демо-форма (сразу опубликованная).
- `validation.ts`: валидация форм и попыток (`HttpError` с 400/404, details-списки), проверка required/options/типов.
- `routes.ts`: админ (`/api/forms`) CRUD + publish/unpublish + attempts; публичный (`/api/public/forms/:slug`) доступ к опубликованным формам и отправка ответов; слаги из названия с разруливанием коллизий.
- `index.ts`: 404-фоллбэк, error middleware, загрузка `.env` из корня репозитория.

## Этап 4. Клиент

- FSD-подобная структура: `app/`, `pages/`, `entities/form`, `api/`, `shared/ui/`.
- Страницы: админка со списком форм, редактор (4 типа вопросов, options-редактор, required, порядок, публикация, копирование ссылки), публичная форма `/f/:slug` с валидацией и экраном благодарности, просмотр ответов (сводка по вариантам + CSV).
- react-router-dom 7, роуты: `/admin`, `/admin/forms/:id`, `/admin/forms/:id/responses`, `/f/:slug`.

## Этап 5. Найденные и исправленные проблемы при проверке

- Vite слушал только IPv6 (`::1`) → Node-fetch/браузеры с 127.0.0.1 не попадали; фикс: `server.host: true`.
- Мелочи: неиспользуемые импорты/state (strict TS), недоработанная генерация CSV — переписана начисто.
- БД лежит в `<root>/data/db.json` (согласуется с `.gitignore`: `/data/*.json`).
- **npm workspaces**: корневой `npm install` не ставил зависимости client/server (по ТЗ — только две команды из корня). Включены workspaces `["client", "server"]`, субпакетные lock-файлы удалены — единственный lock теперь корневой.
- **Сид-формы убраны** по решению пользователя: если форм нет — пустой список (пустой экран в админке), сервер при старте ничего не создаёт.
- Runner остался **concurrently** (как в исходной структуре). Попытку заменить на собственный `scripts/dev.mjs` откатил: причина проверки была в отсутствии `ps` в песочнице (concurrently использует его для tree-kill), на обычных машинах это не проблема.
- При переустановке зависимостей (workspaces + optional deps) esbuild/rolldown однажды поставился не под ту платформу — лечится чистой переустановкой (`rm -rf node_modules package-lock.json && npm install`), зафиксировано на будущее.

## Проверено автоматически (финально)

- `npm install` из корня — ставит зависимости корня, client и server (hoisting в корневой node_modules).
- `npm start` из корня (concurrently): клиент на :3000 (200), `/api/health` и `/api/forms` через прокси — 200; при старте список форм пуст (без сена).
- `npm run typecheck` (server) — чисто; `npm run lint` и `npm run build` (client) — чисто.
- API-сценарии через прокси: create → publish (слаг «стажировка-frontend») → public get → валидная отправка (201) → attempts.
- Клиент перестроен по FSD: `app / pages / widgets / entities / features / shared`, алиас `@/*`, оранжевая брендовая тема через `@theme` токены в `src/index.css`.

## Этап 6. Дизайн-ревизия (иконки, логотип, кастомный select)

- Подключён `lucide-react` (1.60.0): все эмодзи и текстовые стрелки заменены иконками (Header, FormsList, FormEditor, PublicForm, ResponsesViewer, NotFoundPage).
- Логотип сервиса: иконка `FilePlus2` в оранжевом квадрате (`bg-brand-600`), название **FutureForms** (`Future` + оранжевое `Forms`); при hover меняется только цвет квадрата, размеры — без анимаций.
- Новый `shared/ui/select.tsx` (`CustomSelect`): клик-вне-клик/Escape-закрытие, галочка у выбранного варианта, ChevronDown, `role="combobox"/"listbox"`; заменил нативные `<Select>` в редакторе и публичной форме.
- Публичная страница: убран градиентный «glow» фона → плоский `bg-canvas`; чекбоксы/радио — `transition-colors` вместо `transition-all` (не анимируется смена шрифта), выбор за счёт фона и рамки; номер вопроса выровнен по первой строке (size-5 + translate-y).
- Пустые состояния растянуты на высоту экрана (sticky-навбар 64px), более крупная типографика.
- Sticky-панель сохранения в редакторе: точка-индикатор / иконка `Check` вместо текстовых ● и ✓.
- Обновлены `index.html` (title FutureForms) и `favicon.svg` (оранжевый квадрат с плюсом).
- Проверено: `npm run build` (tsc -b + vite, но чисто), `npm run lint` (чисто), smoke-тест деных сервисов: клиент :3000 → 200, `/api/forms` → 200, `/api/public/forms/x` → 404 JSON.
