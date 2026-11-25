import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { cn } from '@/lib/utils'
import {
  SIN_FECHA,
  buildCells,
  etiquetaDia,
  formatValue,
  mismoDia,
  moverDia,
  pad,
  parseDateTime,
  parseValue,
  sumarMeses,
  type Dia,
  type Pending,
} from '@/controls/inputs/calendario'
import { IconButton } from '@/controls/forms/IconButton'
import { clearActivePopup, openPopup, repositionPopup } from '@/controls/inputs/popups'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

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
  const { hoy, ahora } = useData().estado
  const referencia = isDateTime ? ahora : hoy
  const [pending, setPending] = useState<Pending>(() => parseValue(value, referencia) ?? SIN_FECHA)
  const [view, setView] = useState({ y: pending.y, m: pending.m })
  const [foco, setFoco] = useState<Dia>(pending)
  const [timeText, setTimeText] = useState({ hh: '', mm: '' })
  const panelId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef(pending)
  const onChangeRef = useRef(onChange)
  const enfocar = useRef(false)
  useEffect(() => {
    pendingRef.current = pending
    onChangeRef.current = onChange
  })

  const commit = (p: Pending) => onChangeRef.current(formatValue(p, isDateTime))

  const cerrar = () => {
    if (panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus()
    setOpen(false)
  }

  const dismissRef = useRef<() => void>(() => undefined)
  useEffect(() => {
    dismissRef.current = () => {
      onChangeRef.current(formatValue(pendingRef.current, isDateTime))
      cerrar()
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
    if (!open) return
    if (triggerRef.current && panelRef.current) repositionPopup(triggerRef.current, panelRef.current)
    if (enfocar.current) {
      enfocar.current = false
      panelRef.current?.querySelector<HTMLElement>('[data-foco]')?.focus()
    }
  })

  const toggle = () => {
    if (open) {
      cerrar()
      return
    }
    const p = parseValue(value, referencia)
    if (!p) return
    setPending(p)
    setView({ y: p.y, m: p.m })
    setFoco(p)
    setTimeText({ hh: pad(p.hh), mm: pad(p.mm) })
    enfocar.current = true
    setOpen(true)
  }

  const finish = (p: Pending) => {
    commit(p)
    cerrar()
  }

  const selectDay = (dia: Dia) => {
    const p = { ...pending, ...dia }
    setPending(p)
    setView({ y: dia.y, m: dia.m })
    setFoco(dia)
    if (!isDateTime) finish(p)
  }

  const today = () => {
    if (!referencia) return
    const t = parseDateTime(referencia)
    const p = isDateTime ? t : { ...pending, y: t.y, m: t.m, d: t.d }
    setPending(p)
    setView({ y: p.y, m: p.m })
    setFoco(p)
    setTimeText({ hh: pad(p.hh), mm: pad(p.mm) })
    if (!isDateTime) finish(p)
  }

  const nav = (delta: number) => {
    const nuevo = sumarMeses({ y: view.y, m: view.m, d: foco.d }, delta)
    setView({ y: nuevo.y, m: nuevo.m })
    setFoco(nuevo)
  }

  const enDias = (e: KeyboardEvent) => {
    const destino = moverDia(foco, e.key)
    if (!destino) return
    e.preventDefault()
    setFoco(destino)
    setView({ y: destino.y, m: destino.m })
    enfocar.current = true
  }

  const commitTime = (field: 'hh' | 'mm') => {
    const max = field === 'hh' ? 23 : 59
    const val = Math.min(max, Math.max(0, parseInt(timeText[field], 10) || 0))
    setPending((p) => ({ ...p, [field]: val }))
    pendingRef.current = { ...pendingRef.current, [field]: val }
    setTimeText((t) => ({ ...t, [field]: pad(val) }))
  }

  const todayCell = hoy ? parseDateTime(hoy) : null
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const label = !value ? 'Seleccionar fecha' : isDateTime ? fmtDateTime(value) : fmtDate(value)

  return (
    <div
      ref={wrapRef}
      className="cdp"
      style={style}
      onBlur={(e) => {
        if (open && e.relatedTarget instanceof Node && !wrapRef.current?.contains(e.relatedTarget)) dismissRef.current()
      }}
    >
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
        className={cn('cdp-trigger form-input', open && 'open')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className="cdp-label">{label}</span>
        <CalendarDays aria-hidden="true" className="cdp-icon size-4" />
      </button>
      <div ref={panelRef} id={panelId} role="dialog" aria-label="Elegir fecha" className={cn('cdp-panel', open && 'open')}>
        {open && (
          <>
            <div className="cdp-nav">
              <IconButton label="Mes anterior" onClick={() => nav(-1)}>
                <ChevronLeft className="size-4" aria-hidden="true" />
              </IconButton>
              <div className="cdp-month" aria-live="polite">
                {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
              </div>
              <IconButton label="Mes siguiente" onClick={() => nav(1)}>
                <ChevronRight className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
            <div className="cdp-weekdays" aria-hidden="true">
              {WEEKDAYS.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="cdp-days" onKeyDown={enDias}>
              {buildCells(view.y, view.m).map((c) => {
                const isToday = todayCell !== null && mismoDia(c, todayCell)
                const isSel = mismoDia(c, pending)
                const conFoco = mismoDia(c, foco)
                return (
                  <button
                    type="button"
                    key={`${c.y}-${c.m}-${c.d}`}
                    className={cn('cdp-day', c.dim && 'dim', isToday && 'today', isSel && 'sel')}
                    tabIndex={conFoco ? 0 : -1}
                    data-foco={conFoco ? '' : undefined}
                    aria-label={etiquetaDia(c)}
                    aria-pressed={isSel}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => selectDay(c)}
                  >
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
