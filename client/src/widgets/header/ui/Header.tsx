import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link to="/admin" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105">
            Ф
          </span>
          <span className="font-bold tracking-tight text-ink transition-colors group-hover:text-brand-600">
            Формы отклика
          </span>
        </Link>
        <span className="hidden items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-ink-soft ring-1 ring-stone-200 sm:inline-flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          админ-панель менеджера
        </span>
      </div>
    </header>
  )
}
