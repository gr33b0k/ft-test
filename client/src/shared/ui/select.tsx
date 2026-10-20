import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  ariaLabel?: string
}

export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Выберите вариант…',
  className = '',
  ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 text-left text-sm shadow-[0_1px_2px_rgb(28_25_23/0.04)] ring-1 outline-none transition-colors duration-150 ${
          open
            ? 'ring-2 ring-brand-500'
            : 'ring-stone-200 hover:ring-stone-300 focus-visible:ring-2 focus-visible:ring-brand-500'
        }`}
      >
        <span className={`truncate ${selected ? 'text-ink' : 'text-ink-muted/80'}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl bg-white p-1.5 shadow-lg shadow-stone-900/10 ring-1 ring-stone-200"
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onValueChange(option.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-brand-50 ${
                  isSelected ? 'text-brand-700' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="size-4 shrink-0 text-brand-600" aria-hidden />}
              </button>
            )
          })}
          {options.length === 0 && <span className="block px-3 py-2 text-sm text-ink-muted">Нет вариантов</span>}
        </div>
      )}
    </div>
  )
}
