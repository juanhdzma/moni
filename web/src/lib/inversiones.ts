export const eaToMv = (ea: number): number => ((1 + ea / 100) ** (1 / 12) - 1) * 100
export const mvToEa = (mv: number): number => ((1 + mv / 100) ** 12 - 1) * 100

export function tasaEaDesdeInput(texto: string, tipo: 'ea' | 'mv'): number | null {
  const raw = parseFloat(texto) || null
  if (!raw) return null
  return tipo === 'ea' ? raw : mvToEa(raw)
}

export function nextInvPaymentStr(diaPago: number | null, hoy: Date = new Date()): string | null {
  if (!diaPago) return null
  const now = new Date(hoy)
  now.setHours(0, 0, 0, 0)
  let next = new Date(now.getFullYear(), now.getMonth(), diaPago)
  if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, diaPago)
  const days = Math.round((next.getTime() - now.getTime()) / 86400000)
  return days === 0 ? 'hoy' : `en ${days}d`
}

export function rendimientoMensualFija(montoInvertido: number, tasaEa: number): number {
  return Math.round((montoInvertido * eaToMv(tasaEa)) / 100)
}

export function cambioValor(nuevo: number, valorAnterior: number, base: number) {
  const delta = nuevo - valorAnterior
  const total = nuevo - base
  const totalPct = base > 0 ? (total / base) * 100 : 0
  return { delta, total, totalPct }
}
