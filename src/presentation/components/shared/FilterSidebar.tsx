import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './FilterSidebar.css'

type FilterSidebarProps = {
  open: boolean
  title: string
  onClose: () => void
  onApply: () => void
  onReset: () => void
  children: ReactNode
}

export function FilterSidebar({ open, title, onClose, onApply, onReset, children }: FilterSidebarProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, open])

  if (typeof document === 'undefined' || !open) return null

  return createPortal(
    <>
      <div className="filter-sidebar-overlay" onClick={onClose} />
      <aside className="filter-sidebar" role="dialog" aria-modal="true" aria-label={title}>
        <header className="filter-sidebar__header">
          <div>
            <p>Panel de filtros</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar filtros">
            x
          </button>
        </header>

        <div className="filter-sidebar__body">{children}</div>

        <footer className="filter-sidebar__footer">
          <button type="button" className="filter-sidebar__ghost" onClick={onReset}>
            Limpiar
          </button>
          <button type="button" className="filter-sidebar__primary" onClick={onApply}>
            Aplicar filtros
          </button>
        </footer>
      </aside>
    </>,
    document.body,
  )
}
