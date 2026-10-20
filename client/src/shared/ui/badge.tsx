import { type ReactNode } from 'react'

export function Badge({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Опубликовано
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-ink-soft ring-1 ring-stone-200">
      <span className="size-1.5 rounded-full bg-stone-400" />
      Черновик
    </span>
  )
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
      {children}
    </span>
  )
}
