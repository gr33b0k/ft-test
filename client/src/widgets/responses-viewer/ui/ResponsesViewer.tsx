import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formsApi } from '@/entities/form/api'
import { type Attempt, type Form, isChoiceType } from '@/entities/form/model'
import { formatDateTime } from '@/shared/lib/format'
import { Alert, Button, PageLoader } from '@/shared/ui'

function downloadCsv(form: Form, attempts: Attempt[]) {
  const escape = (v: string) => `"${v.replaceAll('"', '""')}"`
  const header = ['Дата отправки', ...form.questions.map((q) => q.label)]
  const rows = attempts.map((attempt) => {
    const cells = form.questions.map((q) => {
      const answer = attempt.answers.find((a) => a.questionId === q.id)
      if (!answer) return ''
      return Array.isArray(answer.value) ? answer.value.join('; ') : answer.value
    })
    return [formatDateTime(attempt.createdAt), ...cells].map(escape)
  })
  const csv = '\uFEFF' + [header.map(escape).join(','), ...rows.map((r) => r.join(','))].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${form.slug || form.id}-answers.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface OptionCount {
  option: string
  count: number
}

export function ResponsesViewer() {
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState<Form | null>(null)
  const [attempts, setAttempts] = useState<Attempt[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([formsApi.get(id!), formsApi.attempts(id!)])
      .then(([f, a]) => {
        setForm(f)
        setAttempts(a)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [id])

  const optionCounts = useMemo(() => {
    if (!form) return []
    return form.questions.map((q) => {
      if (!isChoiceType(q.type)) return { question: q, counts: [] as OptionCount[], max: 0 }
      const totals = new Map<string, number>()
      for (const o of q.options ?? []) totals.set(o, 0)
      for (const a of attempts ?? []) {
        const answer = a.answers.find((ans) => ans.questionId === q.id)
        const values = Array.isArray(answer?.value) ? answer!.value : [answer?.value as string]
        for (const v of values) totals.set(v, (totals.get(v) ?? 0) + 1)
      }
      const max = Math.max(1, ...totals.values())
      return {
        question: q,
        counts: [...totals.entries()].map(([option, count]) => ({ option, count })).sort((x, y) => y.count - x.count),
        max,
      }
    })
  }, [form, attempts])

  if (loading) return <PageLoader />
  if (error)
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <Alert>{error}</Alert>
      </div>
    )
  if (!form) return null

  return (
    <section className="mx-auto max-w-4xl px-5 pb-16 pt-8">
      <Link
        to={`/admin/forms/${form.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-brand-600"
      >
        ← Редактор формы
      </Link>

      <div className="mt-4 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{form.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {attempts!.length > 0 ? (
              <>
                <span className="font-semibold text-brand-600">{attempts!.length}</span> ответ(ов) · все отправки анонимны
              </>
            ) : (
              'Пока нет ответов'
            )}
          </p>
        </div>
        {attempts!.length > 0 && (
          <Button variant="secondary" onClick={() => downloadCsv(form, attempts!)}>
            Скачать CSV
          </Button>
        )}
      </div>

      {optionCounts.some(({ counts }) => counts.length > 0) && (
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink-muted">Сводка по закрытым вопросам</h2>
          <div className="space-y-5">
            {optionCounts
              .filter(({ counts }) => counts.length > 0)
              .map(({ question, counts, max }) => (
                <div key={question.id}>
                  <p className="mb-2 text-sm font-medium text-ink-soft">{question.label}</p>
                  <div className="flex flex-col gap-2">
                    {counts.map(({ option, count }) => (
                      <div key={option} className="flex items-center gap-3 text-xs">
                        <span className="w-44 shrink-0 truncate text-ink-soft" title={option}>
                          {option}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
                            style={{ width: `${(count / (max ?? 1)) * 100}%` }}
                          />
                        </div>
                        <span className="w-9 text-right font-semibold tabular-nums text-ink">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {attempts!.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-stone-300 bg-white px-6 py-20 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand-50 text-xl">📥</div>
          <p className="font-medium text-ink">Ответов пока нет</p>
          <p className="mt-1 text-sm text-ink-muted">Поделитесь ссылкой на форму со студентами.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attempts!.map((attempt, i) => (
            <div key={attempt.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
              <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3 text-xs text-ink-muted">
                <span className="font-semibold text-ink-soft">Отправка #{attempts!.length - i}</span>
                <span>{formatDateTime(attempt.createdAt)}</span>
              </div>
              <dl className="space-y-2.5">
                {form.questions.map((q) => {
                  const answer = attempt.answers.find((a) => a.questionId === q.id)
                  const empty =
                    answer === undefined ||
                    (Array.isArray(answer.value) ? answer.value.length === 0 : String(answer.value).trim() === '')
                  return (
                    <div key={q.id} className="grid gap-1 text-sm sm:grid-cols-[200px_1fr]">
                      <dt className="text-ink-soft">{q.label}</dt>
                      <dd className="font-medium text-ink">
                        {empty ? (
                          <span className="font-normal italic text-ink-muted">— не отвечено —</span>
                        ) : Array.isArray(answer!.value) ? (
                          answer!.value.join(', ')
                        ) : (
                          answer!.value
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
