let currencySymbol = '$'

export function getCurrencySymbol(): string {
  return currencySymbol
}

export function setCurrencySymbol(symbol: string): void {
  currencySymbol = symbol || '$'
}

export const entero = (n: number | null | undefined): string =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n || 0)

export const cop = (n: number | null | undefined): string => getCurrencySymbol() + entero(n)

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
