import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formsApi } from '@/entities/form/api'
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Form,
  type Question,
  type QuestionType,
  isChoiceType,
  publicFormUrl,
} from '@/entities/form/model'
import { Alert, Badge, Button, Input, PageLoader, Select, Textarea } from '@/shared/ui'

function newQuestion(type: QuestionType): Question {
  const q: Question = { id: crypto.randomUUID(), type, label: '', required: false }
  if (isChoiceType(type)) q.options = ['', '']
  return q
}

function cleanupQuestion(q: Question): Question
function cleanupQuestion(q: Question, type: QuestionType): Question
function cleanupQuestion(q: Question, type?: QuestionType): Question {
  const next: Question = { ...q, label: q.label.trim() }
  if (type) next.type = type
  if (isChoiceType(next.type)) {
    next.options = (next.options ?? ['', '']).map((o) => o.trim())
  } else {
    delete next.options
  }
  return next
}

function validateDraft(title: string, questions: Question[]): string[] {
  const errors: string[] = []
  if (title.trim() === '') errors.push('Укажите название формы')
  if (questions.length === 0) errors.push('Добавьте хотя бы один вопрос')
  questions.forEach((q, i) => {
    const where = `Вопрос ${i + 1}: `
    if (q.label.trim() === '') errors.push(`${where}пустой текст вопроса`)
    if (isChoiceType(q.type)) {
      const options = (q.options ?? []).map((o) => o.trim()).filter((o) => o !== '')
      if (options.length < 2) errors.push(`${where}нужно минимум два непустых варианта ответа`)
      else if (new Set(options).size !== options.length) errors.push(`${where}варианты ответа повторяются`)
    }
  })
  return errors
}

export function FormEditor() {
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    formsApi
      .get(id!)
      .then((f) => {
        setForm(f)
        setTitle(f.title)
        setDescription(f.description ?? '')
        setQuestions(f.questions.map((q) => ({ ...q, options: q.options ? [...q.options] : undefined })))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const draftQuestions = useMemo(() => questions.map((q) => cleanupQuestion(q)), [questions])
  const issues = useMemo(() => validateDraft(title, draftQuestions), [title, draftQuestions])
  const changed =
    form === null ||
    form.title !== title ||
    form.description !== (description || undefined) ||
    JSON.stringify(form.questions) !== JSON.stringify(draftQuestions)

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  function changeType(q: Question, type: QuestionType) {
    updateQuestion(q.id, cleanupQuestion({ ...q, type }, type))
  }

  function move(index: number, delta: -1 | 1) {
    setQuestions((qs) => {
      const next = [...qs]
      const target = index + delta
      if (target < 0 || target >= next.length) return qs
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSave() {
    if (issues.length > 0) {
      setError('Исправьте недочёты перед сохранением')
      setDetails(issues)
      return
    }
    setSaving(true)
    setError(null)
    setDetails([])
    try {
      const updated = await formsApi.update(form!.id, {
        title: title.trim(),
        description: description || undefined,
        questions: draftQuestions,
      })
      setForm(updated)
      window.alert('Форма сохранена')
    } catch (e) {
      const apiErr = e as Error & { details?: string[] }
      setError(apiErr.message)
      setDetails(apiErr.details ?? [])
    } finally {
      setSaving(false)
    }
  }

  async function handlePublishToggle() {
    try {
      if (form!.published) {
        if (!window.confirm('Снять форму с публикации? Студенты потеряют доступ по ссылке.')) return
        setForm(await formsApi.unpublish(form!.id))
      } else {
        if (issues.length > 0) {
          setError('Исправьте недочёты перед публикацией')
          setDetails(issues)
          return
        }
        await formsApi.update(form!.id, { title: title.trim(), description: description || undefined, questions: draftQuestions })
        setForm(await formsApi.publish(form!.id))
        window.alert('Форма опубликована')
      }
    } catch (e) {
      const apiErr = e as Error & { details?: string[] }
      setError(apiErr.message)
      setDetails(apiErr.details ?? [])
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(publicFormUrl(form!.slug))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <PageLoader />
  if (notFound || !form)
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <Alert>Форма не найдена. Возможно, она была удалена.</Alert>
      </div>
    )

  return (
    <section className="mx-auto max-w-3xl px-5 pb-40 pt-8">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-brand-600">
        ← Все формы
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title || 'Редактор формы'}</h1>
          <Badge published={form.published} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {form.published && (
            <>
              <Button variant="secondary" onClick={handleCopy}>
                {copied ? 'Скопировано ✓' : 'Копировать ссылку'}
              </Button>
              <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer">
                <Button variant="ghost">Открыть ↗</Button>
              </a>
            </>
          )}
          <Link to={`/admin/forms/${id}/responses`}>
            <Button variant="outline-brand">Ответы →</Button>
          </Link>
          {form.published ? (
            <Button variant="secondary" onClick={handlePublishToggle}>
              Снять с публикации
            </Button>
          ) : (
            <Button variant="primary" onClick={handlePublishToggle}>
              Опубликовать
            </Button>
          )}
        </div>
      </div>

      {form.published && (
        <div className="mb-6">
          <Alert kind="info">
            Студентам доступна ссылка:{' '}
            <code className="rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[13px]">{publicFormUrl(form.slug)}</code>
          </Alert>
        </div>
      )}

      {/* Основное */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-muted">Anкета</h2>
        <div className="space-y-4">
          <Input placeholder="Название формы" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Описание (необязательно)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      {/* Вопросы */}
      <div className="mt-6 space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 transition hover:ring-stone-300">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted">
                <span className="grid size-6 place-items-center rounded-lg bg-brand-100 text-[11px] font-bold text-brand-700">
                  {i + 1}
                </span>
                Вопрос {i + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" className="size-8 p-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Выше">
                  ↑
                </Button>
                <Button variant="ghost" className="size-8 p-0" onClick={() => move(i, 1)} disabled={i === questions.length - 1} aria-label="Ниже">
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  className="size-8 p-0 text-red-500 hover:bg-red-50"
                  onClick={() => setQuestions((qs) => qs.filter((q2) => q2.id !== q.id))}
                  aria-label="Удалить вопрос"
                >
                  ✕
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_230px]">
              <Input placeholder={`Текст вопроса ${i + 1}`} value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} />
              <div className="flex items-center gap-3">
                <Select value={q.type} onChange={(e) => changeType(q, e.target.value as QuestionType)}>
                  {QUESTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    className="size-4 rounded-[4px] border-stone-300"
                    checked={q.required}
                    onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                  />
                  Обязательный
                </label>
              </div>
            </div>

            {isChoiceType(q.type) && (
              <div className="mt-3 space-y-2 rounded-xl bg-canvas p-3">
                {q.options!.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <span className="template grid size-6 place-items-center rounded-lg bg-white text-[11px] font-semibold text-ink-muted ring-1 ring-stone-200">
                      {oi + 1}
                    </span>
                    <Input
                      className="py-1.5"
                      placeholder={`Вариант ${oi + 1}`}
                      value={opt}
                      onChange={(e) => updateQuestion(q.id, { options: q.options!.map((o, j) => (j === oi ? e.target.value : o)) })}
                    />
                    <Button
                      variant="ghost"
                      className="size-8 shrink-0 p-0 text-red-400 hover:bg-red-50 hover:text-red-500"
                      onClick={() => updateQuestion(q.id, { options: q.options!.filter((_, j) => j !== oi) })}
                      disabled={q.options!.length <= 1}
                      aria-label="Удалить вариант"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" className="text-brand-600 hover:bg-brand-50" onClick={() => updateQuestion(q.id, { options: [...q.options!, ''] })}>
                  + Вариант
                </Button>
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((t) => (
            <Button key={t} variant="secondary" onClick={() => setQuestions((qs) => [...qs, newQuestion(t)])}>
              + {QUESTION_TYPE_LABELS[t]}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6">
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

      {/* Панель сохранения */}
      <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl bg-white/95 p-4 shadow-lg shadow-stone-900/10 ring-1 ring-stone-200 backdrop-blur">
        <span className={`text-sm font-medium ${changed ? 'text-brand-600' : 'text-emerald-600'}`}>
          {changed ? '● Есть несохранённые изменения' : '✓ Всё сохранено'}
        </span>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </section>
  )
}
