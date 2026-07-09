import { useEffect, useMemo, useRef, useState } from 'react'
import './BaseCombobox.css'

export type ComboOption = {
  id: string
  nombre: string
}

type BaseComboboxProps = {
  placeholder: string
  allLabel: string
  iconTitle: string
  options: ComboOption[]
  value?: string
  onChange: (id: string | undefined) => void
  showAllOption?: boolean
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export function BaseCombobox({
  placeholder,
  allLabel,
  iconTitle,
  options,
  value,
  onChange,
  showAllOption = true,
}: BaseComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedOption = useMemo(() => options.find((option) => option.id === value), [options, value])
  const filteredOptions = useMemo(() => {
    const search = normalize(query)
    if (!search) return options
    return options.filter((option) => normalize(option.nombre).includes(search))
  }, [options, query])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const selectedLabel = selectedOption?.nombre ?? allLabel

  return (
    <div className="base-combobox" ref={rootRef}>
      <button
        type="button"
        className="base-combobox__trigger"
        aria-label={iconTitle}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedLabel}</span>
        <span className="base-combobox__caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="base-combobox__popover" role="listbox">
          <input
            className="base-combobox__search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />

          <div className="base-combobox__list">
            {showAllOption && (
              <button
                type="button"
                className={!value ? 'is-active' : undefined}
                onClick={() => {
                  onChange(undefined)
                  setOpen(false)
                  setQuery('')
                }}
              >
                {allLabel}
              </button>
            )}

            {filteredOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                className={value === option.id ? 'is-active' : undefined}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                  setQuery('')
                }}
              >
                {option.nombre}
              </button>
            ))}

            {filteredOptions.length === 0 && (
              <div className="base-combobox__empty">No hay coincidencias para "{query.trim()}".</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
