import { describe, expect, it } from 'vitest'
import { buildCells, etiquetaDia, formatValue, mismoDia, moverDia, pad, parseDateTime, parseValue, SIN_FECHA, sumarDias, sumarMeses } from '@/controls/inputs/calendario'

const propios = (y: number, m: number) => buildCells(y, m).filter((c) => !c.dim)

describe('buildCells', () => {
  it('febrero 2026 empieza en domingo: seis días de enero atenuados y 42 celdas', () => {
    const cells = buildCells(2026, 1)
    expect(cells).toHaveLength(42)
    expect(cells.slice(0, 6)).toEqual([26, 27, 28, 29, 30, 31].map((d) => ({ d, m: 0, y: 2026, dim: true })))
    expect(cells[6]).toEqual({ d: 1, m: 1, y: 2026, dim: false })
    expect(cells[33]).toEqual({ d: 28, m: 1, y: 2026, dim: false })
    expect(cells[34]).toEqual({ d: 1, m: 2, y: 2026, dim: true })
  })

  it('un mes que empieza en lunes no lleva días previos', () => {
    const cells = buildCells(2026, 5)
    expect(cells[0]).toEqual({ d: 1, m: 5, y: 2026, dim: false })
    expect(cells).toHaveLength(42)
  })

  it('largo de mes: 28 (feb 2026), 29 (feb 2028), 30 (abril) y 31 (enero)', () => {
    expect(propios(2026, 1)).toHaveLength(28)
    expect(propios(2028, 1)).toHaveLength(29)
    expect(propios(2026, 3)).toHaveLength(30)
    expect(propios(2026, 0)).toHaveLength(31)
  })

  it('enero mira a diciembre del año anterior y diciembre a enero del siguiente', () => {
    const ene = buildCells(2026, 0)
    expect(ene[0]).toEqual({ d: 29, m: 11, y: 2025, dim: true })
    const dic = buildCells(2026, 11)
    expect(dic[41]).toEqual({ d: 10, m: 0, y: 2027, dim: true })
    expect(dic.filter((c) => c.dim && c.y === 2027).length).toBeGreaterThan(0)
  })
})

describe('moverDia y sumarMeses', () => {
  it('flechas, semana y mes con wrap de año', () => {
    const d = { y: 2026, m: 0, d: 1 }
    expect(moverDia(d, 'ArrowLeft')).toEqual({ y: 2025, m: 11, d: 31 })
    expect(moverDia({ y: 2026, m: 11, d: 31 }, 'ArrowRight')).toEqual({ y: 2027, m: 0, d: 1 })
    expect(moverDia(d, 'ArrowUp')).toEqual({ y: 2025, m: 11, d: 25 })
    expect(moverDia(d, 'ArrowDown')).toEqual({ y: 2026, m: 0, d: 8 })
    expect(moverDia(d, 'PageUp')).toEqual({ y: 2025, m: 11, d: 1 })
    expect(moverDia({ y: 2026, m: 11, d: 31 }, 'PageDown')).toEqual({ y: 2027, m: 0, d: 31 })
  })

  it('Home y End van a lunes y domingo de la semana; otra tecla no mueve', () => {
    expect(moverDia({ y: 2026, m: 7, d: 5 }, 'Home')).toEqual({ y: 2026, m: 7, d: 3 })
    expect(moverDia({ y: 2026, m: 7, d: 5 }, 'End')).toEqual({ y: 2026, m: 7, d: 9 })
    expect(moverDia({ y: 2026, m: 7, d: 3 }, 'Home')).toEqual({ y: 2026, m: 7, d: 3 })
    expect(moverDia({ y: 2026, m: 7, d: 9 }, 'End')).toEqual({ y: 2026, m: 7, d: 9 })
    expect(moverDia({ y: 2026, m: 7, d: 5 }, 'a')).toBeNull()
  })

  it('sumarMeses de enero a diciembre y de diciembre a enero recorta el día', () => {
    expect(sumarMeses({ y: 2026, m: 0, d: 31 }, -1)).toEqual({ y: 2025, m: 11, d: 31 })
    expect(sumarMeses({ y: 2026, m: 11, d: 31 }, 1)).toEqual({ y: 2027, m: 0, d: 31 })
    expect(sumarMeses({ y: 2026, m: 2, d: 31 }, 1)).toEqual({ y: 2026, m: 3, d: 30 })
    expect(sumarMeses({ y: 2028, m: 0, d: 30 }, 1)).toEqual({ y: 2028, m: 1, d: 29 })
    expect(sumarDias({ y: 2026, m: 2, d: 1 }, -1)).toEqual({ y: 2026, m: 1, d: 28 })
  })
})

describe('parseo y formato', () => {
  it('pad, parseDateTime y formatValue con y sin hora', () => {
    expect(pad(5)).toBe('05')
    expect(parseDateTime('2026-08-05T07:09')).toEqual({ y: 2026, m: 7, d: 5, hh: 7, mm: 9 })
    expect(parseDateTime('2026-08-05')).toEqual({ y: 2026, m: 7, d: 5, hh: 0, mm: 0 })
    expect(formatValue({ y: 2026, m: 0, d: 5, hh: 7, mm: 9 }, true)).toBe('2026-01-05T07:09')
    expect(formatValue({ y: 2026, m: 0, d: 5, hh: 7, mm: 9 }, false)).toBe('2026-01-05')
    expect(SIN_FECHA).toEqual({ y: 1970, m: 0, d: 1, hh: 0, mm: 0 })
  })

  it('parseValue usa el valor, luego la referencia y si no hay ninguno devuelve null', () => {
    expect(parseValue('2026-08-05', '2026-01-01')).toEqual({ y: 2026, m: 7, d: 5, hh: 0, mm: 0 })
    expect(parseValue('', '2026-01-01')).toEqual({ y: 2026, m: 0, d: 1, hh: 0, mm: 0 })
    expect(parseValue('', '')).toBeNull()
  })

  it('mismoDia compara año, mes y día; etiquetaDia va en español', () => {
    expect(mismoDia({ y: 2026, m: 1, d: 1 }, { y: 2026, m: 1, d: 1 })).toBe(true)
    expect(mismoDia({ y: 2026, m: 1, d: 1 }, { y: 2025, m: 1, d: 1 })).toBe(false)
    expect(mismoDia({ y: 2026, m: 1, d: 1 }, { y: 2026, m: 2, d: 1 })).toBe(false)
    expect(mismoDia({ y: 2026, m: 1, d: 1 }, { y: 2026, m: 1, d: 2 })).toBe(false)
    expect(etiquetaDia({ y: 2026, m: 7, d: 5 })).toBe('miércoles, 5 de agosto de 2026')
  })
})
