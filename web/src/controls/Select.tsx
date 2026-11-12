import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { clearActivePopup, openPopup, repositionPopup } from '../shell/popups'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  compact?: boolean
  id?: string
  style?: CSSProperties
  ariaLabel?: string
}

export function Select({ value, onChange, options, compact = false, id, style, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const dismissRef = useRef(() => setOpen(false))
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const dismiss = dismissRef.current
    const reposition = () => {
      if (triggerRef.current && menuRef.current) repositionPopup(triggerRef.current, menuRef.current, { matchWidth: !compact })
    }
    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition, true)
    openPopup(dismiss)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition, true)
      clearActivePopup(dismiss)
    }
  }, [open, compact])

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  return (
    <div className={'cdd' + (compact ? ' cdd-inline' : '')} style={style} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <select
        id={id}
        className={'cdd-enhanced cdd-native' + (compact ? ' select-styled' : '')}
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        ref={triggerRef}
        className={'cdd-trigger ' + (compact ? 'select-styled' : 'form-input') + (open ? ' open' : '')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cdd-label">{selected?.label ?? ''}</span>
        <span className="cdd-arrow">▾</span>
      </button>
      <div ref={menuRef} className={'cdd-menu' + (open ? ' open' : '')} role="listbox">
        {options.map((o) => (
          <div
            key={o.value}
            role="option"
            tabIndex={open ? 0 : -1}
            aria-selected={o.value === value}
            className={'cdd-option' + (o.value === value ? ' sel' : '')}
            onClick={() => pick(o.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                pick(o.value)
              }
            }}
          >
            {o.label}
          </div>
        ))}
      </div>
    </div>
  )
}
