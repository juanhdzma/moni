import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { fmtDate, fmtDateTime } from '../lib/format'
import { clearActivePopup, openPopup, repositionPopup } from '../shell/popups'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

interface Pending {
  y: number
  m: number
  d: number
  hh: number
  mm: number
}

const pad = (n: number) => String(n).padStart(2, '0')

export function parseValue(value: string, isDateTime: boolean): Pending {
  const now = new Date()
  if (!value) {
    return {
      y: now.getFullYear(),
      m: now.getMonth(),
      d: now.getDate(),
      hh: isDateTime ? now.getHours() : 0,
      mm: isDateTime ? now.getMinutes() : 0,
    }
  }
  const [datePart = '', timePart] = value.split('T')
  const [y = 0, mo = 1, d = 1] = datePart.split('-').map(Number)
  const [hh, mm] = (timePart || '00:00').split(':').map(Number)
  return { y, m: mo - 1, d, hh: hh || 0, mm: mm || 0 }
}

export function formatValue(s: Pending, isDateTime: boolean): string {
  const dateStr = `${s.y}-${pad(s.m + 1)}-${pad(s.d)}`
  return isDateTime ? `${dateStr}T${pad(s.hh)}:${pad(s.mm)}` : dateStr
}

interface Cell {
  d: number
  m: number
  y: number
  dim: boolean
}

function buildCells(viewY: number, viewM: number): Cell[] {
  const firstDow = (new Date(viewY, viewM, 1).getDay() + 6) % 7
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewY, viewM, 0).getDate()
  const cells: Cell[] = []
  for (let i = 0; i < firstDow; i++) {
    cells.push({
      d: daysInPrevMonth - firstDow + 1 + i,
      m: viewM === 0 ? 11 : viewM - 1,
      y: viewM === 0 ? viewY - 1 : viewY,
      dim: true,
    })
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, m: viewM, y: viewY, dim: false })
  for (;;) {
    const last = cells[cells.length - 1]
    if (!last) break
    const nd = new Date(last.y, last.m, last.d + 1)
    cells.push({ d: nd.getDate(), m: nd.getMonth(), y: nd.getFullYear(), dim: true })
    if (cells.length >= 42) break
  }
  return cells
}

interface Props {
  value: string
  onChange: (value: string) => void
  type?: 'date' | 'datetime-local'
  id?: string
  style?: CSSProperties
}

export function DatePicker({ value, onChange, type = 'date', id, style }: Props) {
  const isDateTime = type === 'datetime-local'
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<Pending>(() => parseValue(value, isDateTime))
  const [view, setView] = useState({ y: pending.y, m: pending.m })
  const [timeText, setTimeText] = useState({ hh: '', mm: '' })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef(pending)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    pendingRef.current = pending
    onChangeRef.current = onChange
  })

  const commit = (p: Pending) => onChangeRef.current(formatValue(p, isDateTime))

  const dismissRef = useRef<() => void>(() => undefined)
  useEffect(() => {
    dismissRef.current = () => {
      onChangeRef.current(formatValue(pendingRef.current, isDateTime))
      setOpen(false)
    }
  })

  useEffect(() => {
    if (!open) return
    const dismiss = () => dismissRef.current()
    const reposition = () => {
      if (triggerRef.current && panelRef.current) repositionPopup(triggerRef.current, panelRef.current)
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
  }, [open])

  useEffect(() => {
    if (open && panelRef.current && triggerRef.current) repositionPopup(triggerRef.current, panelRef.current)
  })

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const p = parseValue(value, isDateTime)
    setPending(p)
    setView({ y: p.y, m: p.m })
    setTimeText({ hh: pad(p.hh), mm: pad(p.mm) })
    setOpen(true)
  }

  const finish = (p: Pending) => {
    commit(p)
    setOpen(false)
  }

  const selectDay = (y: number, m: number, d: number) => {
    const p = { ...pending, y, m, d }
    setPending(p)
    setView({ y, m })
    if (!isDateTime) finish(p)
  }

  const today = () => {
    const now = new Date()
    const p = isDateTime
      ? { y: now.getFullYear(), m: now.getMonth(), d: now.getDate(), hh: now.getHours(), mm: now.getMinutes() }
      : { ...pending, y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }
    setPending(p)
    setView({ y: p.y, m: p.m })
    setTimeText({ hh: pad(p.hh), mm: pad(p.mm) })
    if (!isDateTime) finish(p)
  }

  const nav = (delta: number) => {
    let m = view.m + delta
    let y = view.y
    if (m < 0) {
      m = 11
      y--
    }
    if (m > 11) {
      m = 0
      y++
    }
    setView({ y, m })
  }

  const commitTime = (field: 'hh' | 'mm') => {
    const max = field === 'hh' ? 23 : 59
    const val = Math.min(max, Math.max(0, parseInt(timeText[field], 10) || 0))
    setPending((p) => ({ ...p, [field]: val }))
    pendingRef.current = { ...pendingRef.current, [field]: val }
    setTimeText((t) => ({ ...t, [field]: pad(val) }))
  }

  const now = new Date()
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const label = !value ? 'Seleccionar fecha' : isDateTime ? fmtDateTime(value) : fmtDate(value)

  return (
    <div className="cdp" style={style}>
      <input
        className="cdp-enhanced cdp-native"
        type={type}
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        ref={triggerRef}
        id={id}
        className={'cdp-trigger form-input' + (open ? ' open' : '')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="cdp-label">{label}</span>
        <span className="cdp-icon">📅</span>
      </button>
      <div ref={panelRef} className={'cdp-panel' + (open ? ' open' : '')}>
        {open && (
          <>
            <div className="cdp-nav">
              <button type="button" className="cdp-nav-btn" aria-label="Mes anterior" onClick={() => nav(-1)}>
                ‹
              </button>
              <div className="cdp-month">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
              <button type="button" className="cdp-nav-btn" aria-label="Mes siguiente" onClick={() => nav(1)}>
                ›
              </button>
            </div>
            <div className="cdp-weekdays">
              {WEEKDAYS.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="cdp-days">
              {buildCells(view.y, view.m).map((c) => {
                const isToday = c.y === now.getFullYear() && c.m === now.getMonth() && c.d === now.getDate()
                const isSel = c.y === pending.y && c.m === pending.m && c.d === pending.d
                const cls = ['cdp-day', c.dim && 'dim', isToday && 'today', isSel && 'sel'].filter(Boolean).join(' ')
                return (
                  <button type="button" key={`${c.y}-${c.m}-${c.d}`} className={cls} onClick={() => selectDay(c.y, c.m, c.d)}>
                    {c.d}
                  </button>
                )
              })}
            </div>
            {isDateTime && (
              <div className="cdp-time-row">
                {(['hh', 'mm'] as const).map((f, i) => (
                  <Fragment key={f}>
                    {i === 1 && <span className="cdp-time-sep">:</span>}
                    <input
                      className="cdp-time-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      aria-label={f === 'hh' ? 'Hora' : 'Minutos'}
                      value={timeText[f]}
                      onChange={(e) => setTimeText((t) => ({ ...t, [f]: e.target.value }))}
                      onBlur={() => commitTime(f)}
                      onKeyDown={(e) => e.key === 'Enter' && commitTime(f)}
                    />
                  </Fragment>
                ))}
              </div>
            )}
            <div className="cdp-actions">
              <button type="button" className="cdp-today" onClick={today}>
                Hoy
              </button>
              {isDateTime && (
                <button type="button" className="cdp-accept" onClick={() => finish(pendingRef.current)}>
                  Aceptar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
