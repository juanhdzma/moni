export const MAX_FIGURAS = 20

export function escalaUnidad(valores: number[], maxFiguras = MAX_FIGURAS): number {
  const max = Math.max(0, ...valores.map((v) => Math.abs(v)))
  if (max <= 0) return 1
  const raw = max / maxFiguras
  const p = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 5]) if (m * p >= raw) return m * p
  return 10 * p
}

export interface Figuras {
  enteras: number
  resto: number
}

// Remnants snap to half a figure: a thinner cut of a silhouette reads as a glyph (a "1", a "|"), not as a fraction.
export function partirFiguras(valor: number, unidad: number): Figuras {
  const n = Math.abs(valor) / unidad
  if (n <= 0) return { enteras: 0, resto: 0 }
  const enteras = Math.floor(n + 1e-9)
  const resto = n - enteras
  if (enteras === 0) return resto >= 0.75 ? { enteras: 1, resto: 0 } : { enteras: 0, resto: 0.5 }
  if (resto < 0.25) return { enteras, resto: 0 }
  if (resto < 0.75) return { enteras, resto: 0.5 }
  return { enteras: enteras + 1, resto: 0 }
}

export function fmtUnidad(unidad: number, simbolo = '$'): string {
  const fmt = (n: number, suf: string) => simbolo + String(n).replace('.', ',') + suf
  if (unidad >= 1e9) return fmt(unidad / 1e9, 'B')
  if (unidad >= 1e6) return fmt(unidad / 1e6, 'M')
  if (unidad >= 1e3) return fmt(unidad / 1e3, 'k')
  return fmt(unidad, '')
}
