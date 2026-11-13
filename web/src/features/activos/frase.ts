import { cop, pct } from '../../lib/format'

export function fraseActivos(cantidad: number, totalAct: number, totalIni: number): string {
  if (!cantidad) return 'Todavía no registraste activos.'
  const variacion = totalAct - totalIni
  if (!totalIni || Math.abs(variacion) < 1) return `Tus activos valen ${cop(totalAct)}, lo mismo que pagaste.`
  const p = pct(Math.abs((variacion / totalIni) * 100))
  const dir = variacion > 0 ? 'más' : 'menos'
  return `Tus activos valen ${cop(totalAct)}, ${cop(Math.abs(variacion))} ${dir} de lo que pagaste (${p}%).`
}
