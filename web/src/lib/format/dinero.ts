export const entero = (n: number | null | undefined): string =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n || 0)

export const formatearCop = (n: number | null | undefined, simbolo: string): string => simbolo + entero(n)

export function formatearCopCorto(n: number, simbolo: string): string {
  const abs = Math.abs(n)
  const s = n < 0 ? '−' : ''
  if (abs >= 1e12) return s + simbolo + (abs / 1e12).toFixed(1).replace('.', ',') + 'B'
  if (abs >= 1e9) return s + simbolo + (abs / 1e9).toFixed(1).replace('.', ',') + 'MM'
  if (abs >= 1e6) return s + simbolo + (abs / 1e6).toFixed(1).replace('.', ',') + 'M'
  if (abs >= 1e3) return s + simbolo + Math.round(abs / 1e3) + 'k'
  return s + formatearCop(abs, simbolo)
}

export function pct(n: number | null | undefined, d = 1): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0)
}
