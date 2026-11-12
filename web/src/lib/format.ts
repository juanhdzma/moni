let currencySymbol: string | null = null

export function getCurrencySymbol(): string {
  if (currencySymbol !== null) return currencySymbol
  try {
    currencySymbol = localStorage.getItem('moni_currency_symbol') || '$'
  } catch {
    currencySymbol = '$'
  }
  return currencySymbol
}

export function clearCurrencySymbolCache(): void {
  currencySymbol = null
}

export function setCurrencySymbol(symbol: string): void {
  try {
    localStorage.setItem('moni_currency_symbol', symbol)
  } catch {
    return
  } finally {
    clearCurrencySymbolCache()
  }
}

export function cop(n: number | null | undefined): string {
  return getCurrencySymbol() + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n || 0)
}

export function copShort(n: number): string {
  const abs = Math.abs(n)
  const s = n < 0 ? '−' : ''
  const sym = getCurrencySymbol()
  if (abs >= 1e9) return s + sym + (abs / 1e9).toFixed(1).replace('.', ',') + 'B'
  if (abs >= 1e6) return s + sym + (abs / 1e6).toFixed(1).replace('.', ',') + 'M'
  if (abs >= 1e3) return s + sym + Math.round(abs / 1e3) + 'k'
  return s + cop(abs)
}

export function pct(n: number | null | undefined, d = 1): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0)
}

export const signStr = (n: number): string => (n >= 0 ? '+' : '−')

export function normDate(s: string | null | undefined): string {
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

export function mediodia(s: string): Date {
  const m = (normDate(s).split('T')[0] ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return new Date(NaN)
  const month = +(m[2] ?? 0)
  const day = +(m[3] ?? 0)
  if (month < 1 || month > 12 || day < 1 || day > 31) return new Date(NaN)
  return new Date(+(m[1] ?? 0), month - 1, day, 12)
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = mediodia(s)
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtDateShort(s: string | null | undefined): string {
  if (!s) return '—'
  const d = mediodia(s)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function isoMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function txMonth(t: { fecha: string }): string {
  return (normDate(t.fecha).split('T')[0] ?? '').slice(0, 7)
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayStr(now: Date = new Date()): string {
  return isoDate(now)
}

export function fechaLocal(fecha: string): Date | null {
  const m = normDate(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(+(m[1] ?? 0), +(m[2] ?? 0) - 1, +(m[3] ?? 0)) : null
}

export function isStale(dateStr: string | null | undefined, days = 30): boolean {
  if (!dateStr) return false
  const d = mediodia(dateStr)
  if (Number.isNaN(d.getTime())) return false
  return (Date.now() - d.getTime()) / 86400000 >= days
}

export function nowStr(now: Date = new Date()): string {
  const d = now
  return `${isoDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '—'
  const timePart = normDate(s).split('T')[1]
  const d = mediodia(s)
  if (Number.isNaN(d.getTime())) return s
  const dateStr = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return timePart ? `${dateStr} ${timePart}` : dateStr
}

export interface MoneyInputLike {
  value: string
  selectionStart: number | null
  setSelectionRange(start: number, end: number): void
}

export function fmtMoneyInput(el: MoneyInputLike): void {
  const digitosAntes = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length

  let raw = el.value.replace(/[^\d,]/g, '')
  const parts = raw.split(',')
  if (parts.length > 2) raw = parts[0] + ',' + parts.slice(1).join('')
  el.value = (raw.split(',')[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  let pos = 0
  for (let vistos = 0; pos < el.value.length && vistos < digitosAntes; pos++) {
    const c = el.value.charAt(pos)
    if (c >= '0' && c <= '9') vistos++
  }
  el.setSelectionRange(pos, pos)
}

export function parseMoney(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

export function numToInput(n: number | null | undefined): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n || 0)
}
