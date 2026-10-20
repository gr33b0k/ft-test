import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChartColumn,
  Download,
  Inbox,
  PenLine,
} from "lucide-react";
import { formsApi } from "@/entities/form/api";
import { type Attempt, type Form } from "@/entities/form/model";
import { buildAttemptsCsv } from "@/shared/lib/csv";
import { formatDateTime } from "@/shared/lib/format";
import { Alert, Badge, Button, Chip, PageLoader } from "@/shared/ui";
import {
  buildConversion,
  buildDailyActivity,
  buildOptionCounts,
  pluralizeAnswers,
  splitByStatus,
} from "../lib";

function downloadCsv(form: Form, attempts: Attempt[]) {
  const csv = buildAttemptsCsv({ form, attempts: attempts.filter((a) => a.status === "submitted") });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${form.slug || form.id}-answers.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Tab = "answers" | "stats";

const TABS: { key: Tab; label: string }[] = [
  { key: "answers", label: "Ответы" },
  { key: "stats", label: "Статистика" },
];

export function ResponsesViewer() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const from = (location.state as { from?: "list" | "editor" } | null)?.from;
  const [tab, setTab] = useState<Tab>("answers");
  const [form, setForm] = useState<Form | null>(null);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([formsApi.get(id!), formsApi.attempts(id!)])
      .then(([f, a]) => {
        setForm(f);
        setAttempts(a);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Ошибка загрузки"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (error)
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <Alert>{error}</Alert>
      </div>
    );
  if (!form) return null;

  const { started, submitted } = splitByStatus(attempts!);
  const submittedCount = submitted.length;
  const startedCount = started.length;
  const conversion = buildConversion(attempts!);
  const activity = buildDailyActivity(attempts!);
  const optionCounts = buildOptionCounts(form, submitted);

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-8">
      <Link
        to={from === "list" ? "/admin" : `/admin/forms/${form.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {from === "list" ? "Все формы" : "Редактор формы"}
      </Link>

      {/* Шапка страницы */}
      <div className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {form.title}
            </h1>
            <Badge published={form.published} />
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {submittedCount > 0 ? (
              <>
                Получено{" "}
                <span className="font-semibold text-brand-600">
                  {submittedCount}
                </span>{" "}
                {pluralizeAnswers(submittedCount)}
                {startedCount > 0 && (
                  <>
                    {" · "}
                    <span className="text-ink-muted">
                      {startedCount}{" "}
                      {startedCount === 1 ? "незаконченный" : "незаконченные"}:{" "}
                      пишут, но ещё не отправили
                    </span>
                  </>
                )}
              </>
            ) : startedCount > 0 ? (
              `${startedCount} заполняет форму, отправок пока нет`
            ) : (
              "Ответов пока нет — статистика появится с первыми отправками"
            )}
          </p>
        </div>
        {submittedCount > 0 && (
          <Button
            variant="secondary"
            className="px-5 py-2.5"
            onClick={() => downloadCsv(form, attempts!)}
          >
            <Download className="size-4" aria-hidden />
            Скачать CSV
          </Button>
        )}
      </div>

      {/* Табы */}
      <div
        role="tablist"
        aria-label="Разделы страницы ответов"
        className="mb-8 inline-flex rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200"
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold transition-colors duration-150 ${
              tab === key
                ? "bg-white text-ink shadow-sm ring-1 ring-stone-200"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "answers" ? (
        <AnswersTab form={form} submitted={submitted} started={started} />
      ) : (
        <StatsTab
          empty={attempts!.length === 0}
          submittedCount={submittedCount}
          startedCount={startedCount}
          conversionRate={conversion.rate}
          activity={activity}
          optionCounts={optionCounts}
        />
      )}
    </section>
  );
}

/* ─────────────── Таб «Ответы» ─────────────── */

function AnswersTab({
  form,
  submitted,
  started,
}: {
  form: Form;
  submitted: Attempt[];
  started: Attempt[];
}) {
  if (submitted.length === 0 && started.length === 0) {
    return (
      <div className="flex min-h-[380px] flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-300 bg-white px-6 py-14 text-center">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Inbox className="size-7" aria-hidden />
        </div>
        <p className="text-lg font-semibold text-ink">Здесь пока пусто</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          Как только студенты заполнят форму, их ответы появятся в этом списке.
        </p>
      </div>
    );
  }

  return (
    <div>
      {submitted.length > 0 && (
        <section aria-label="Ответы студентов">
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-bold tracking-tight text-ink">
            <span className="grid size-8 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <Inbox className="size-4" aria-hidden />
            </span>
            Ответы студентов
            <Chip>{submitted.length}</Chip>
          </h2>
          <ol className="space-y-4">
            {submitted.map((attempt, i) => (
              <AttemptCard
                key={attempt.id}
                form={form}
                attempt={attempt}
                serial={i + 1}
              />
            ))}
          </ol>
        </section>
      )}

      {started.length > 0 && (
        <section aria-label="Незаконченные отклики" className="mt-10">
          <h2 className="mb-1 flex items-center gap-2.5 text-base font-bold tracking-tight text-ink">
            <span className="grid size-8 place-items-center rounded-xl bg-stone-200 text-ink-muted">
              <PenLine className="size-4" aria-hidden />
            </span>
            Незаконченные отклики
            <Chip>{started.length}</Chip>
          </h2>
          <p className="mb-4 text-xs text-ink-muted">
            Начали заполнять, но пока не отправили
          </p>
          <ol className="space-y-4">
            {started.map((attempt, i) => (
              <AttemptCard
                key={attempt.id}
                form={form}
                attempt={attempt}
                serial={i + 1}
                unfinished
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function AttemptCard({
  form,
  attempt,
  serial,
  unfinished = false,
}: {
  form: Form;
  attempt: Attempt;
  serial: number;
  unfinished?: boolean;
}) {
  return (
    <li
      className={`rounded-2xl shadow-sm transition-shadow hover:shadow-md ring-1 ${
        unfinished
          ? "border-2 border-dashed border-stone-300 bg-stone-50 ring-transparent"
          : "bg-white ring-stone-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid size-6 place-items-center rounded-lg text-[11px] font-bold ${
              unfinished
                ? "bg-stone-200 text-ink-muted"
                : "bg-brand-100 text-brand-700"
            }`}
          >
            {serial}
          </span>
          {unfinished ? (
            <span className="text-sm font-medium text-ink-soft">
              Начал(а) заполнять · не отправлено
            </span>
          ) : (
            <span className="text-sm font-semibold text-ink">
              Отправка {serial}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-ink-muted">
          {formatDateTime(attempt.createdAt)}
        </span>
      </div>
      <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-[minmax(0,220px)_1fr]">
        {attempt.answers.length === 0 && (
          <div className="sm:col-span-2">
            <dd className="italic text-ink-muted">Ответов ещё нет</dd>
          </div>
        )}
        {attempt.answers.map((answer) => {
          const q = form.questions.find((question) => question.id === answer.questionId);
          return (
            <div key={answer.questionId} className="grid gap-0.5 sm:contents">
              <dt className="font-medium text-ink-soft">{q?.label ?? answer.questionId}</dt>
              <dd className="text-ink">
                {Array.isArray(answer.value) ? (
                  <span className="flex flex-wrap gap-1.5">
                    {answer.value.map((v) => (
                      <Chip key={v}>{v}</Chip>
                    ))}
                  </span>
                ) : (
                  <span className="whitespace-pre-line">{answer.value}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </li>
  );
}

/* ─────────────── Таб «Статистика» ─────────────── */

interface OptionCount {
  option: string;
  count: number;
}

interface AttemptOptionSummary {
  question: { id: string; label: string };
  counts: OptionCount[];
  total: number;
}

function StatsTab({
  empty,
  submittedCount,
  startedCount,
  conversionRate,
  activity,
  optionCounts,
}: {
  empty: boolean;
  submittedCount: number;
  startedCount: number;
  conversionRate: number;
  activity: { date: string; label: string; count: number }[];
  optionCounts: AttemptOptionSummary[];
}) {
  if (empty) {
    return (
      <div className="flex min-h-[380px] flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-300 bg-white px-6 py-14 text-center">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <ChartColumn className="size-7" aria-hidden />
        </div>
        <p className="text-lg font-semibold text-ink">Статистики пока нет</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          Здесь появится конверсия, активность по дням и сводка по вариантам —
          как только студенты начнут заполнять форму.
        </p>
      </div>
    );
  }

  const activityMax = Math.max(1, ...activity.map((d) => d.count));

  return (
    <div className="space-y-6">
      {/* Конверсия */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
        <h2 className="mb-6 flex items-center gap-2.5 text-base font-bold tracking-tight text-ink">
          <span className="grid size-8 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <PenLine className="size-4" aria-hidden />
          </span>
          Конверсия в отправку
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Начали заполнять" value={startedCount} hint="сохранили хотя бы часть" />
          <StatCard label="Заполнили до конца" value={submittedCount} hint="отправленных откликов" />
          <StatCard
            label="Конверсия"
            value={`${Math.round(conversionRate * 100)}%`}
            hint="дошли до отправки"
            accent
          />
        </div>
      </div>

      {/* Активность по дням */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
        <h2 className="mb-1.5 flex items-center gap-2.5 text-base font-bold tracking-tight text-ink">
          <span className="grid size-8 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <ChartColumn className="size-4" aria-hidden />
          </span>
          Активность по дням
        </h2>
        <p className="mb-6 text-xs text-ink-muted">Отправок за последние 14 дней</p>
        <div className="flex h-32 items-end gap-1.5">
          {activity.map((day) => (
            <div
              key={day.date}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
              title={`${day.label}: ${day.count}`}
            >
              {day.count > 0 && (
                <span className="text-[10px] font-semibold tabular-nums text-ink-soft">
                  {day.count}
                </span>
              )}
              <div
                className={`w-full rounded-md transition-all duration-300 ${
                  day.count > 0 ? "bg-brand-500" : "bg-stone-100"
                }`}
                style={{ height: day.count > 0 ? `${(day.count / activityMax) * 100}%` : "3px" }}
              />
              <span className="truncate text-[9px] font-medium text-ink-muted">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Сводка по вариантам */}
      {optionCounts.some(({ counts }) => counts.length > 0) && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
          <h2 className="mb-6 flex items-center gap-2.5 text-base font-bold tracking-tight text-ink">
            <span className="grid size-8 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <Inbox className="size-4" aria-hidden />
            </span>
            Сводка по вариантам
          </h2>
          <div className="space-y-7">
            {optionCounts
              .filter(({ counts }) => counts.length > 0)
              .map(({ question, counts, total }) => (
                <div key={question.id}>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{question.label}</p>
                    <p className="text-xs font-medium text-ink-muted">из {total}</p>
                  </div>
                  <div className="space-y-2">
                    {counts.map(({ option, count }) => (
                      <div
                        key={option}
                        className="grid grid-cols-[minmax(0,160px)_1fr_3.75rem] items-center gap-3 text-xs sm:grid-cols-[minmax(0,240px)_1fr_3.75rem]"
                      >
                        <span className="truncate font-medium text-ink-soft" title={option}>
                          {option}
                        </span>
                        <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all duration-300"
                            style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-right font-semibold tabular-nums text-ink">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: number | string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ring-1 ${
        accent ? "bg-brand-50 ring-brand-200" : "bg-canvas ring-stone-200"
      }`}
    >
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${
          accent ? "text-brand-700" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>
    </div>
  );
}
