import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface CustomSelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  options: CustomSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
}

export default function CustomSelect({ value, options, onChange, placeholder, ariaLabel, className = '' }: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  return <div className={`solace-select ${open ? 'is-open' : ''} ${className}`} ref={rootRef}>
    <button type="button" className="solace-select-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen(current => !current)}>
      <span className={selected ? '' : 'solace-select-placeholder'}>{selected?.label ?? placeholder ?? 'Choose an option'}</span>
      <ChevronDown size={15} className="solace-select-chevron" aria-hidden="true" />
    </button>
    {open && <div className="solace-select-menu" role="listbox">
      {options.map(option => <button type="button" role="option" aria-selected={option.value === value} className={`solace-select-option ${option.value === value ? 'selected' : ''}`} key={option.value} onClick={() => { onChange(option.value); setOpen(false) }}>
        <span>{option.label}</span>
        {option.value === value && <Check size={15} className="solace-select-check" aria-hidden="true" />}
      </button>)}
    </div>}
  </div>
}
