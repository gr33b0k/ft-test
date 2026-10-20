import { Link } from 'react-router-dom'
import { FilePlus2 } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link to="/admin" className="group flex items-center gap-2.5" aria-label="FutureForms — на главную">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
            <FilePlus2 className="size-[18px]" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="text-[15px] font-extrabold tracking-tight">
            <span className="text-ink transition-colors duration-150 group-hover:text-brand-600">Future</span>
            <span className="text-brand-600">Forms</span>
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
