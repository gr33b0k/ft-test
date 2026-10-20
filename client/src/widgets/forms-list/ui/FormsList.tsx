import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Copy, FileText } from 'lucide-react'
import { formsApi } from '@/entities/form/api'
import { type Form, publicFormUrl } from '@/entities/form/model'
import { formatDateTime } from '@/shared/lib/format'
import { Alert, Badge, Button, PageLoader } from '@/shared/ui'

export function FormsList() {
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const navigate = useNavigate()

  const refresh = useCallback(async () => {
    try {
      setForms(await formsApi.list())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- первичная загрузка списка при монтировании
    refresh()
  }, [refresh])

  async function handleCreate() {
    setCreating(true)
    try {
      const form = await formsApi.create({ title: 'Новая форма отклика', description: '', questions: [] })
      navigate(`/admin/forms/${form.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать форму')
      setCreating(false)
    }
  }

  async function handleDelete(form: Form) {
    if (!window.confirm(`Удалить форму «${form.title}»? Ответы студентов тоже будут удалены.`)) return
    try {
      await formsApi.remove(form.id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить форму')
    }
  }

  async function handleTogglePublish(form: Form) {
    try {
      await (form.published ? formsApi.unpublish(form.id) : formsApi.publish(form.id))
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить статус публикации')
    }
  }

  async function handleCopy(form: Form) {
    await navigator.clipboard.writeText(publicFormUrl(form.slug))
    setCopiedId(form.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return <PageLoader />

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-16 pt-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Формы отклика</h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-soft">
            Собирайте анкеты для стажировок и мероприятий, публикуйте их по ссылке и смотрите ответы студентов.
          </p>
        </div>
        <Button onClick={handleCreate} disabled={creating} className="px-5 py-2.5">
          {creating ? 'Создание…' : '+ Создать форму'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 shrink-0">
          <Alert>{error}</Alert>
        </div>
      )}

      {forms.length === 0 ? (
        <div className="flex flex-1 flex-col">
          <div className="flex w-full flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <FileText className="size-7" aria-hidden />
            </div>
            <p className="text-lg font-semibold text-ink">Форм пока нет</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              Создайте первую форму отклика — соберите вопросы, опубликуйте её
              и поделитесь ссылкой со студентами.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {forms.map((form) => (
            <li
              key={form.id}
              className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 transition-all duration-200 hover:shadow-md hover:ring-stone-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge published={form.published} />
                    <span className="text-xs font-medium text-ink-muted">
                      {form.questions.length > 0 ? `${form.questions.length} вопрос(ов)` : 'без вопросов'}
                    </span>
                  </div>
                  <Link
                    to={`/admin/forms/${form.id}`}
                    className="mt-2.5 block truncate text-lg font-semibold tracking-tight text-ink transition-colors hover:text-brand-600"
                  >
                    {form.title}
                  </Link>
                  {form.description && <p className="mt-1 truncate text-sm text-ink-soft">{form.description}</p>}
                  <p className="mt-2.5 text-xs text-ink-muted">обновлена {formatDateTime(form.updatedAt)}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {form.published ? (
                    <>
                      <Button variant="secondary" onClick={() => handleCopy(form)}>
                        {copiedId === form.id ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                        {copiedId === form.id ? 'Скопировано' : 'Копировать ссылку'}
                      </Button>
                      <Button variant="secondary" onClick={() => handleTogglePublish(form)}>
                        Снять с публикации
                      </Button>
                    </>
                  ) : (
                    <Button variant="primary" onClick={() => handleTogglePublish(form)} disabled={form.questions.length === 0}>
                      Опубликовать
                    </Button>
                  )}
                  <Link to={`/admin/forms/${form.id}/responses`} state={{ from: 'list' }}>
                    <Button variant="ghost">Ответы</Button>
                  </Link>
                  <Button variant="danger" onClick={() => handleDelete(form)}>
                    Удалить
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
