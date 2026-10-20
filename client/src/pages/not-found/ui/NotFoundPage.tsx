import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="grid size-16 place-items-center rounded-3xl bg-brand-100 text-2xl text-brand-600">🧭</div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Страница не найдена</h1>
      <Link to="/admin" className="text-sm font-medium text-brand-600 hover:underline">
        Перейти в админ-панель
      </Link>
    </div>
  )
}
