import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

export const fieldStyles =
  'w-full rounded-xl bg-white text-ink shadow-[0_1px_2px_rgb(28_25_23/0.04)] ring-1 ring-stone-200 outline-none transition-all duration-150 placeholder:text-ink-muted/70 hover:ring-stone-300 focus:ring-2 focus:ring-brand-500 focus:shadow-[0_1px_2px_rgb(28_25_23/0.04)]'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldStyles} px-3 py-2 text-sm ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldStyles} min-h-20 px-3 py-2 text-sm ${className}`} {...props} />
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldStyles} pr-8 text-sm ${className}`} {...props} />
}

export function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </span>
      {children}
    </label>
  )
}
