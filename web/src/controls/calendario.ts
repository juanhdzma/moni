export interface Pending {
  y: number
  m: number
  d: number
  hh: number
  mm: number
}

export interface Dia {
  y: number
  m: number
  d: number
}

export interface Cell extends Dia {
  dim: boolean
}

export const SIN_FECHA: Pending = { y: 1970, m: 0, d: 1, hh: 0, mm: 0 }

export const pad = (n: number) => String(n).padStart(2, '0')

export function parseDateTime(value: string): Pending {
  const [datePart = '', timePart] = value.split('T')
  const [y = 0, mo = 1, d = 1] = datePart.split('-').map(Number)
  const [hh, mm] = (timePart || '00:00').split(':').map(Number)
  return { y, m: mo - 1, d, hh: hh || 0, mm: mm || 0 }
}

export function parseValue(value: string, referencia: string): Pending | null {
  const origen = value || referencia
  return origen ? parseDateTime(origen) : null
}

export function formatValue(s: Pending, isDateTime: boolean): string {
  const dateStr = `${s.y}-${pad(s.m + 1)}-${pad(s.d)}`
  return isDateTime ? `${dateStr}T${pad(s.hh)}:${pad(s.mm)}` : dateStr
}

export function buildCells(viewY: number, viewM: number): Cell[] {
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

export function sumarDias(dia: Dia, dias: number): Dia {
  const f = new Date(dia.y, dia.m, dia.d + dias)
  return { y: f.getFullYear(), m: f.getMonth(), d: f.getDate() }
}

export function sumarMeses(dia: Dia, meses: number): Dia {
  const primero = new Date(dia.y, dia.m + meses, 1)
  const ultimo = new Date(primero.getFullYear(), primero.getMonth() + 1, 0).getDate()
  return { y: primero.getFullYear(), m: primero.getMonth(), d: Math.min(dia.d, ultimo) }
}

const diaDeSemana = (dia: Dia) => (new Date(dia.y, dia.m, dia.d).getDay() + 6) % 7

export function moverDia(dia: Dia, tecla: string): Dia | null {
  switch (tecla) {
    case 'ArrowLeft':
      return sumarDias(dia, -1)
    case 'ArrowRight':
      return sumarDias(dia, 1)
    case 'ArrowUp':
      return sumarDias(dia, -7)
    case 'ArrowDown':
      return sumarDias(dia, 7)
    case 'Home':
      return sumarDias(dia, -diaDeSemana(dia))
    case 'End':
      return sumarDias(dia, 6 - diaDeSemana(dia))
    case 'PageUp':
      return sumarMeses(dia, -1)
    case 'PageDown':
      return sumarMeses(dia, 1)
    default:
      return null
  }
}

export const mismoDia = (a: Dia, b: Dia) => a.y === b.y && a.m === b.m && a.d === b.d

export const etiquetaDia = (dia: Dia): string =>
  new Date(dia.y, dia.m, dia.d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
