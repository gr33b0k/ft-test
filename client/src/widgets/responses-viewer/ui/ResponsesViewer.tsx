import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, ChartColumn, Download, Inbox } from "lucide-react";
import { formsApi } from "@/entities/form/api";
import { type Attempt, type Form } from "@/entities/form/model";
import { buildAttemptsCsv } from "@/shared/lib/csv";
import { formatDateTime } from "@/shared/lib/format";
import { Alert, Badge, Button, Chip, PageLoader } from "@/shared/ui";
import { type AttemptOptionSummary, buildOptionCounts, pluralizeAnswers } from "../lib";

function downloadCsv(form: Form, attempts: Attempt[]) {
  const csv = buildAttemptsCsv({ form, attempts });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${form.slug || form.id}-answers.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResponsesViewer() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const from = (location.state as { from?: "list" | "editor" } | null)?.from;
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

  const optionCounts: AttemptOptionSummary[] =
    form && attempts ? buildOptionCounts(form, attempts) : [];

  if (loading) return <PageLoader />;
  if (error)
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <Alert>{error}</Alert>
      </div>
    );
  if (!form) return null;

  const answerCount = attempts!.length;

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
      <div className="mt-4 mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {form.title}
            </h1>
            <Badge published={form.published} />
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {answerCount > 0 ? (
              <>
                Получено{" "}
                <span className="font-semibold text-brand-600">
                  {answerCount}
                </span>{" "}
                {pluralizeAnswers(answerCount)}
              </>
            ) : (
              "Ответов пока нет — сводка появится с первыми отправками"
            )}
          </p>
        </div>
        {answerCount > 0 && (
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

      {/* Сводка по вариантам */}
      {answerCount > 0 &&
        optionCounts.some(({ counts }) => counts.length > 0) && (
          <div className="mb-12 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
            <h2 className="mb-6 flex items-center gap-2.5 text-base font-bold tracking-tight text-ink">
              <span className="grid size-8 place-items-center rounded-xl bg-brand-100 text-brand-700">
                <ChartColumn className="size-4" aria-hidden />
              </span>
              Сводка по вариантам
            </h2>
            <div className="space-y-7">
              {optionCounts
                .filter(({ counts }) => counts.length > 0)
                .map(({ question, counts, total }) => (
                  <div key={question.id}>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">
                        {question.label}
                      </p>
                      <p className="text-xs font-medium text-ink-muted">
                        из {total}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {counts.map(({ option, count }) => (
                        <div
                          key={option}
                          className="grid grid-cols-[minmax(0,160px)_1fr_3.75rem] items-center gap-3 text-xs sm:grid-cols-[minmax(0,240px)_1fr_3.75rem]"
                        >
                          <span
                            className="truncate font-medium text-ink-soft"
                            title={option}
                          >
                            {option}
                          </span>
                          <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                            <div
                              className="h-full rounded-full bg-brand-500 transition-all duration-300"
                              style={{
                                width: `${
                                  total > 0 ? (count / total) * 100 : 0
                                }%`,
                              }}
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

      {/* Ответы студентов */}
      <section aria-label="Ответы студентов">
        <h2 className="mb-4 flex items-center gap-2.5 text-base font-bold tracking-tight text-ink">
          <span className="grid size-8 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <Inbox className="size-4" aria-hidden />
          </span>
          Ответы студентов
          {answerCount > 0 && <Chip>{answerCount}</Chip>}
        </h2>

        {answerCount === 0 ? (
          <div className="flex min-h-95 flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-300 bg-white px-6 py-14 text-center">
            <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Inbox className="size-7" aria-hidden />
            </div>
            <p className="text-lg font-semibold text-ink">Здесь пока пусто</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              Как только студенты заполнят форму, их ответы появятся в этом
              списке.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {attempts!.map((attempt, i) => (
              <li
                key={attempt.id}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-6 place-items-center rounded-lg bg-brand-100 text-[11px] font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      Отправка {i + 1}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-ink-muted">
                    {formatDateTime(attempt.createdAt)}
                  </span>
                </div>
                <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-[minmax(0,220px)_1fr]">
                  {form.questions.map((q) => {
                    const answer = attempt.answers.find(
                      (a) => a.questionId === q.id,
                    );
                    const empty =
                      answer === undefined ||
                      (Array.isArray(answer.value)
                        ? answer.value.length === 0
                        : String(answer.value).trim() === "");
                    return (
                      <div key={q.id} className="grid gap-0.5 sm:contents">
                        <dt className="font-medium text-ink-soft">{q.label}</dt>
                        <dd className="text-ink">
                          {empty ? (
                            <span className="italic text-ink-muted">
                              не отвечено
                            </span>
                          ) : Array.isArray(answer!.value) ? (
                            <span className="flex flex-wrap gap-1.5">
                              {answer!.value.map((v) => (
                                <Chip key={v}>{v}</Chip>
                              ))}
                            </span>
                          ) : (
                            <span className="whitespace-pre-line">
                              {answer!.value}
                            </span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
