import { type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline-brand'

const base =
  'inline-flex select-none items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold tracking-tight transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none'

const styles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white ring-1 ring-brand-700/30 shadow-sm hover:bg-brand-500 hover:shadow-md',
  secondary: 'bg-white text-ink-soft ring-1 ring-stone-200 shadow-sm hover:bg-stone-50 hover:ring-stone-300',
  ghost: 'bg-transparent text-ink-soft hover:bg-stone-100',
  danger: 'bg-white text-red-600 ring-1 ring-red-100 hover:bg-red-50 hover:ring-red-200',
  success: 'bg-emerald-600 text-white ring-1 ring-emerald-700/30 shadow-sm hover:bg-emerald-500',
  'outline-brand': 'bg-brand-50 text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />
}
