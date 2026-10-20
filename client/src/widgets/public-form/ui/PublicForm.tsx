import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, SearchX } from 'lucide-react'
import { type Answer, type Form, type Question } from '@/entities/form/model'
import { submissionApi } from '@/features/submission/api'
import {
  answersFromAttempt,
  clearSavedAttempt,
  createProgressSaver,
  readSavedAttemptId,
  saveAttemptId,
  type ProgressSaver,
} from '@/features/submission/model'
import { Alert, Button, CustomSelect, PageLoader, Textarea } from '@/shared/ui'

function FormQuestion({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string | string[]
  onChange: (value: string | string[]) => void
}) {
  switch (question.type) {
    case 'text':
      return <Textarea value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Ваш ответ" />
    case 'select':
      return (
        <CustomSelect
          value={(value as string) ?? ''}
          onValueChange={onChange}
          options={(question.options ?? []).map((o) => ({ value: o, label: o }))}
          placeholder="Выберите вариант…"
          ariaLabel={question.label}
        />
      )
    case 'checkbox':
      return (
        <div className="grid gap-2.5">
          {question.options!.map((o) => {
            const checked = Array.isArray(value) && value.includes(o)
            return (
              <label
                key={o}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm ring-1 transition-colors duration-150 ${
                  checked
                    ? 'bg-brand-50 text-ink ring-brand-300'
                    : 'bg-white text-ink-soft ring-stone-200 hover:ring-stone-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="size-4"
                  checked={checked}
                  onChange={(e) => {
                    const next = Array.isArray(value) ? [...value] : []
                    if (e.target.checked) next.push(o)
                    else next.splice(next.indexOf(o), 1)
                    onChange(next)
                  }}
                />
                {o}
              </label>
            )
          })}
        </div>
      )
    case 'radio':
      return (
        <div className="grid gap-2.5">
          {question.options!.map((o) => (
            <label
              key={o}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm ring-1 transition-colors duration-150 ${
                value === o
                  ? 'bg-brand-50 text-ink ring-brand-300'
                  : 'bg-white text-ink-soft ring-stone-200 hover:ring-stone-300'
              }`}
            >
              <input type="radio" name={`q-${question.id}`} className="size-4" value={o} checked={value === o} onChange={() => onChange(o)} />
              {o}
            </label>
          ))}
        </div>
      )
  }
}

function clientValidate(form: Form, answers: Record<string, string | string[]>): string[] {
  const errors: string[] = []
  for (const q of form.questions) {
    const value = answers[q.id] ?? (q.type === 'checkbox' ? [] : '')
    const empty = q.type === 'checkbox' ? (value as string[]).length === 0 : String(value).trim() === ''
    if (q.required && empty) errors.push(`Пропущен обязательный вопрос: «${q.label}»`)
  }
  return errors
}

export function PublicForm({ slug }: { slug: string }) {
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const[previouslySubmitted, setPreviouslySubmitted] = useState(false)
  const attemptIdRef = useRef<string | null>(null)
  const saverRef = useRef<ProgressSaver | null>(null)

  // восстановление черновика после перезагрузки
  useEffect(() => {
    submissionApi
      .getPublishedForm(slug)
      .then((f) => {
        setForm(f)
        const savedId = readSavedAttemptId(f.id)
        if (!savedId) return
        return submissionApi
          .getAttempt(slug, savedId)
          .then((attempt) => {
            if (attempt.status === 'submitted') {
              clearSavedAttempt(f.id)
              setPreviouslySubmitted(true)
              return
            }
            attemptIdRef.current = attempt.id
            setAnswers((prev) => ({ ...answersFromAttempt(attempt), ...prev }))
          })
          .catch(() => {
            // attempt удалён, форма переиздана под другим id — прогресс не восстановить
            clearSavedAttempt(f.id)
          })
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Форма не найдена'))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    return () => saverRef.current?.cancel()
  }, [])

  function toPayload(map: Record<string, string | string[]> = answers): Answer[] {
    if (!form) return []
    return form.questions
      .map((q) => ({ questionId: q.id, value: map[q.id] ?? (q.type === 'checkbox' ? [] : '') }))
      .filter((a) => (Array.isArray(a.value) ? a.value.length > 0 : String(a.value).trim() !== ''))
  }

  function updateAnswer(id: string, value: string | string[]) {
    setAnswers((a) => {
      const next = { ...a, [id]: value }
      answersRef.current = next
      return next
    })
    ensureSaver()?.save(toPayload(answersRef.current))
  }

  const answersRef = useRef<Record<string, string | string[]>>({})

  function ensureSaver(): ProgressSaver | null {
    if (!form) return null
    if (!saverRef.current) {
      saverRef.current = createProgressSaver({
        hasStarted: () => attemptIdRef.current !== null,
        onStart: async (payload) => {
          try {
            const attempt = await submissionApi.startAttempt(slug, payload)
            attemptIdRef.current = attempt.id
            saveAttemptId(form.id, attempt.id)
          } catch {
            // без интернета черновик не создаётся; отправка всё равно будет требовать сеть
          }
        },
        onUpdate: async (payload) => {
          const id = attemptIdRef.current
          if (!id) return
          try {
            await submissionApi.updateAttempt(slug, id, payload)
          } catch {
            // сервер недоступен — сохранимся при следующем изменении
          }
        },
      })
    }
    return saverRef.current
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form) return

    const local = clientValidate(form, answers)
    if (local.length > 0) {
      setError('Проверьте ответы на форме')
      setDetails(local)
      return
    }

    setSubmitting(true)
    setError(null)
    setDetails([])
    try {
      const saver = saverRef.current
      if (saver) await saver.flush()
      await submissionApi.submit(slug, toPayload(answersRef.current), attemptIdRef.current ?? undefined)
      clearSavedAttempt(form.id)
      attemptIdRef.current = null
      setSubmitted(true)
      window.scrollTo(0, 0)
    } catch (err) {
      const apiErr = err as Error & { details?: string[] }
      setError(err instanceof Error ? err.message : 'Ошибка отправки')
      setDetails(apiErr.details ?? [])
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <SearchX className="size-7" aria-hidden />
        </div>
        <Alert>{loadError}</Alert>
      </div>
    )
  }

  if (submitted || previouslySubmitted) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24">
        <div className="rounded-3xl bg-white p-10 text-center shadow-xl shadow-stone-900/5 ring-1 ring-stone-200">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-brand-100 text-brand-600">
            <Check className="size-8" strokeWidth={2.5} aria-hidden />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {submitted ? 'Ответ отправлен' : 'Вы уже отправляли эту форму'}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {submitted ? 'Спасибо! Ваш отклик успешно зарегистрирован.' : 'Спасибо, ваши ответы уже зарегистрированы.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-5 pb-14 pt-10">
      <div className="rounded-3xl bg-white p-6 shadow-xl shadow-stone-900/5 ring-1 ring-stone-200 sm:p-9">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
          Форма отклика
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">{form!.title}</h1>
        {form!.description && <p className="mt-2 text-sm whitespace-pre-line text-ink-soft">{form!.description}</p>}

        <div className="mt-9 space-y-7">
          {form!.questions.map((q, i) => (
            <div key={q.id}>
              <div className="mb-2.5 flex items-start gap-2.5">
                <span className="grid size-5 shrink-0 translate-y-[1px] place-items-center rounded-md bg-stone-100 text-[10px] font-bold text-ink-soft">
                  {i + 1}
                </span>
                <span className="block text-sm font-semibold leading-snug text-ink">
                  {q.label}
                  {q.required && <span className="text-brand-600"> *</span>}
                </span>
              </div>
              <FormQuestion
                question={q}
                value={answers[q.id] ?? (q.type === 'checkbox' ? [] : '')}
                onChange={(v) => updateAnswer(q.id, v)}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-7">
            <Alert>
              {error}
              {details.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </Alert>
          </div>
        )}

        <div className="mt-9">
          <Button type="submit" disabled={submitting} className="w-full py-3 text-base sm:w-auto sm:px-10">
            {submitting ? 'Отправка…' : 'Отправить отклик'}
          </Button>
          <p className="mt-3 text-xs text-ink-muted">
            Черновик сохраняется автоматически — можно вернуться и дописать позже.
          </p>
        </div>
      </div>
      <p className="mt-5 text-center text-xs text-ink-muted">Карьерная платформа · анонимная форма отклика</p>
    </form>
  )
}
