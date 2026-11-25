import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import type { Opcion } from '@/types'
import { clearActivePopup, openPopup, repositionPopup } from '@/controls/inputs/popups'

interface Props {
  value: string
  onChange: (value: string) => void
  options: Opcion[]
  compact?: boolean
  id?: string
  style?: CSSProperties
  ariaLabel?: string
}

const TYPEAHEAD_MS = 600

export function Select({ value, onChange, options, compact = false, id, style, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const baseId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const selected = options.find((o) => o.value === value)
  const triggerId = id ?? `${baseId}-trigger`
  const optionId = (i: number) => `${baseId}-opt-${i}`

  const close = () => {
    if (menuRef.current?.contains(document.activeElement)) triggerRef.current?.focus()
    setOpen(false)
  }
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  useEffect(() => {
    if (!open) return
    const dismiss = () => closeRef.current()
    const reposition = () => {
      if (triggerRef.current && menuRef.current) repositionPopup(triggerRef.current, menuRef.current, { matchWidth: !compact })
    }
    reposition()
    menuRef.current?.focus()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition, true)
    openPopup(dismiss)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition, true)
      clearActivePopup(dismiss)
    }
  }, [open, compact])

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' })
  })

  const abrir = (indice?: number) => {
    const actual = options.findIndex((o) => o.value === value)
    setActive(indice ?? Math.max(actual, 0))
    setOpen(true)
  }

  const pick = (v: string) => {
    onChange(v)
    close()
  }

  const buscar = (letra: string) => {
    const ahora = Date.now()
    const t = typed.current
    t.text = ahora - t.at > TYPEAHEAD_MS ? letra : t.text + letra
    t.at = ahora
    const texto = t.text.toLowerCase()
    const desde = t.text.length === 1 ? active + 1 : active
    const orden = [...options.keys()].map((i) => (i + desde) % options.length)
    return orden.find((i) => options[i]?.label.toLowerCase().startsWith(texto))
  }

  const enTrigger = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      abrir()
    }
  }

  const enLista = (e: KeyboardEvent) => {
    const ultimo = options.length - 1
    const mover = (i: number) => {
      e.preventDefault()
      setActive(Math.min(ultimo, Math.max(0, i)))
    }
    if (e.key === 'ArrowDown') mover(active + 1)
    else if (e.key === 'ArrowUp') mover(active - 1)
    else if (e.key === 'Home') mover(0)
    else if (e.key === 'End') mover(ultimo)
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const o = options[active]
      if (o) pick(o.value)
    } else if (e.key === 'Tab') setOpen(false)
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const i = buscar(e.key)
      if (i !== undefined) mover(i)
    }
  }

  return (
    <div ref={wrapRef} className={cn('cdd', compact && 'cdd-inline')} style={style}>
      <select className="cdd-enhanced cdd-native" value={value} tabIndex={-1} aria-hidden="true" onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        ref={triggerRef}
        id={triggerId}
        className={cn('cdd-trigger', compact ? 'select-styled' : 'form-input', open && 'open')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-lista`}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : abrir())}
        onKeyDown={enTrigger}
      >
        <span className="cdd-label">{(selected ?? options[0])?.label ?? ''}</span>
        <ChevronDown aria-hidden="true" className="cdd-arrow size-3.5" />
      </button>
      <div
        ref={menuRef}
        id={`${baseId}-lista`}
        className={cn('cdd-menu', open && 'open')}
        role="listbox"
        tabIndex={open ? 0 : -1}
        aria-labelledby={triggerId}
        aria-activedescendant={open ? optionId(active) : undefined}
        onKeyDown={enLista}
        onBlur={(e) => {
          if (open && e.relatedTarget instanceof Node && !wrapRef.current?.contains(e.relatedTarget)) setOpen(false)
        }}
      >
        {options.map((o, i) => (
          <div
            key={o.value}
            id={optionId(i)}
            role="option"
            aria-selected={o.value === value}
            className={cn('cdd-option', o.value === value && 'sel', open && i === active && 'active')}
            onClick={() => pick(o.value)}
            onMouseMove={() => i !== active && setActive(i)}
          >
            {o.label}
          </div>
        ))}
      </div>
    </div>
  )
}
