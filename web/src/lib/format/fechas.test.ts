import { describe, expect, it } from 'vitest'
import { fmtDate, fmtDateShort, fmtDateTime, soloFecha } from './index'

describe('normDate a través de fmtDateTime y fmtDate', () => {
  it('recorta espacios alrededor', () => {
    expect(fmtDateTime('  2026-08-15T10:30  ')).toBe('15/08/2026 10:30')
    expect(fmtDate('  2026-08-15  ')).toBe('15/08/2026')
  })

  it('acepta espacio como separador de hora y corta los segundos', () => {
    expect(fmtDateTime('2026-08-15 10:30')).toBe('15/08/2026 10:30')
    expect(fmtDateTime('2026-08-15T10:30:45')).toBe('15/08/2026 10:30')
  })

  it('una fecha sin hora no agrega hora', () => {
    expect(fmtDateTime('2026-08-15')).toBe('15/08/2026')
  })

  it.each(['2026-08-15X', 'x2026-08-15', '2026-8-15', '26-08-15', '2026-08-1', '2026-08-15Z10:30', 'x2026-08-15T10:30', '12026-08-15'])(
    '%s no es una fecha reconocida y se devuelve tal cual',
    (s) => {
      expect(fmtDate(s)).toBe(s)
      expect(fmtDateTime(s)).toBe(s)
      expect(fmtDateShort(s)).toBe('—')
    },
  )

  it.each([null, undefined, ''])('el valor vacío %j da raya en las tres variantes', (v) => {
    expect(fmtDate(v)).toBe('—')
    expect(fmtDateShort(v)).toBe('—')
    expect(fmtDateTime(v)).toBe('—')
  })

  it('un valor de solo espacios se devuelve tal cual en vez de formatearse', () => {
    expect(fmtDate('   ')).toBe('   ')
    expect(fmtDateShort('   ')).toBe('—')
  })
})

describe('bordes de mes y día (mediodia)', () => {
  it.each([
    ['2026-01-01', '01/01/2026'],
    ['2026-12-31', '31/12/2026'],
    ['2026-12-01', '01/12/2026'],
    ['2026-01-31', '31/01/2026'],
  ])('%s es válida', (s, esperado) => {
    expect(fmtDate(s)).toBe(esperado)
  })

  it.each(['2026-00-10', '2026-13-10', '2026-12-32', '2026-01-00', '2026-99-99'])('%s está fuera de rango: fmtDate devuelve la entrada y la corta da raya', (s) => {
    expect(fmtDate(s)).toBe(s)
    expect(fmtDateShort(s)).toBe('—')
    expect(fmtDateTime(`${s}T10:30`)).toBe(`${s}T10:30`)
  })

  it('fmtDateShort muestra día y mes abreviado, sin año', () => {
    expect(fmtDateShort('2026-12-31')).toMatch(/^31 (de )?dic\.?$/)
    expect(fmtDateShort('2026-01-01')).toMatch(/^0?1 (de )?ene\.?$/)
  })

  it('el mediodía local evita correr el día en GMT-5', () => {
    expect(fmtDate('2026-03-01')).toBe('01/03/2026')
    expect(fmtDateTime('2026-03-01T00:00')).toBe('01/03/2026 00:00')
    expect(fmtDateTime('2026-03-01T23:59')).toBe('01/03/2026 23:59')
  })
})

describe('soloFecha', () => {
  it('toma lo anterior a la primera T y deja pasar otras cosas', () => {
    expect(soloFecha('2026-08-15T10:30T11')).toBe('2026-08-15')
    expect(soloFecha('')).toBe('')
    expect(soloFecha('T10:30')).toBe('')
    expect(soloFecha('2026-08-15 10:30')).toBe('2026-08-15 10:30')
  })
})
