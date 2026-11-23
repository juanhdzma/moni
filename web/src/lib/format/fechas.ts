export const soloFecha = (valor: string | null | undefined): string => (valor ?? '').split('T')[0] ?? ''

function normDate(s: string | null | undefined): string {
  if (!s) return ''
  s = String(s).trim()
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(s)) return s.slice(0, 10) + 'T' + s.slice(11, 16)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\s,]+(\d{1,2}:\d{2}))?/)
  if (m) {
    const iso = `${m[3]}-${(m[2] ?? '').padStart(2, '0')}-${(m[1] ?? '').padStart(2, '0')}`
    return m[4] ? `${iso}T${m[4].padStart(5, '0')}` : iso
  }
  return s
}

function mediodia(s: string): Date {
  const m = soloFecha(normDate(s)).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return new Date(NaN)
  const month = +(m[2] ?? 0)
  const day = +(m[3] ?? 0)
  if (month < 1 || month > 12 || day < 1 || day > 31) return new Date(NaN)
  return new Date(+(m[1] ?? 0), month - 1, day, 12)
}

const fechaCompleta = (d: Date): string =>
  d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = mediodia(s)
  return Number.isNaN(d.getTime()) ? s : fechaCompleta(d)
}

export function fmtDateShort(s: string | null | undefined): string {
  if (!s) return '—'
  const d = mediodia(s)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '—'
  const timePart = normDate(s).split('T')[1]
  const d = mediodia(s)
  if (Number.isNaN(d.getTime())) return s
  const dateStr = fechaCompleta(d)
  return timePart ? `${dateStr} ${timePart}` : dateStr
}
