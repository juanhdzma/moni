import { describe, expect, test, beforeEach } from 'vitest'
import {
  cop,
  copShort,
  fmtDate,
  fmtDateShort,
  fmtDateTime,
  fmtMoneyInput,
  isoDate,
  mediodia,
  nowStr,
  numToInput,
  normDate,
  parseMoney,
  pct,
  setCurrencySymbol,
  todayStr,
} from './format'

function input(value: string, caret = value.length) {
  return {
    value,
    selectionStart: caret as number | null,
    setSelectionRange(a: number) {
      this.selectionStart = a
    },
  }
}

test('el monto se formatea con puntos de miles', () => {
  const el = input('1234567')
  fmtMoneyInput(el)
  expect(el.value).toBe('1.234.567')
})

test('el caret se queda donde estaba, no salta al final', () => {
  const el = input('1.2934', 4)
  fmtMoneyInput(el)
  expect(el.value).toBe('12.934')
  expect(el.value.slice(0, el.selectionStart ?? 0)).toBe('12.9')
})

test('el caret sobrevive a la aparición de un separador', () => {
  const el = input('1234', 4)
  fmtMoneyInput(el)
  expect(el.value).toBe('1.234')
  expect(el.selectionStart).toBe(5)
})

test('caret al principio se queda al principio', () => {
  const el = input('1234', 0)
  fmtMoneyInput(el)
  expect(el.selectionStart).toBe(0)
})

test('se ignora todo lo que no sea dígito', () => {
  const el = input('12a3$4')
  fmtMoneyInput(el)
  expect(el.value).toBe('1.234')
  expect(parseMoney(el.value)).toBe(1234)
})

test('normDate lleva los formatos sueltos a ISO', () => {
  expect(normDate('2026-08-15')).toBe('2026-08-15')
  expect(normDate('15/08/2026')).toBe('2026-08-15')
  expect(normDate('2026-08-15T10:30:00')).toBe('2026-08-15T10:30')
  expect(normDate('')).toBe('')
})

describe('formato', () => {
  beforeEach(() => {
    setCurrencySymbol('$')
  })

  test('parseMoney entiende coma decimal y puntos de miles', () => {
    expect(parseMoney('1.234.567')).toBe(1234567)
    expect(parseMoney('1.234,5')).toBe(1234.5)
    expect(parseMoney('')).toBe(0)
  })

  test('numToInput usa puntos de miles', () => {
    expect(numToInput(1234567)).toBe('1.234.567')
    expect(numToInput(null)).toBe('0')
  })

  test('cop y copShort usan el símbolo configurado', () => {
    expect(cop(1500000)).toBe('$1.500.000')
    expect(copShort(1500000)).toBe('$1,5M')
    expect(copShort(-2500)).toBe('−$3k')
    expect(copShort(2_000_000_000)).toBe('$2,0B')
    expect(copShort(-500)).toBe('−$500')
    setCurrencySymbol('€')
    expect(cop(1000)).toBe('€1.000')
  })

  test('pct respeta los decimales', () => {
    expect(pct(12.345)).toBe('12,3')
    expect(pct(12.345, 2)).toBe('12,35')
    expect(pct(null)).toBe('0,0')
  })

  test('fechas: dd/mm/aaaa sin correrse un día', () => {
    expect(fmtDate('2026-08-01')).toBe('01/08/2026')
    expect(fmtDate('')).toBe('—')
    expect(fmtDateShort('2026-08-01')).toMatch(/^0?1 (de )?ago/)
    expect(fmtDateTime('2026-08-01T09:05')).toBe('01/08/2026 09:05')
  })

  test('mediodia desborda el día como el parseo viejo (2026-02-31 -> 3 mar) y rechaza mes o día fuera de rango', () => {
    expect(mediodia('2026-02-31').getMonth()).toBe(2)
    expect(mediodia('2026-02-31').getDate()).toBe(3)
    expect(Number.isNaN(mediodia('2026-13-01').getTime())).toBe(true)
    expect(Number.isNaN(mediodia('2026-01-32').getTime())).toBe(true)
    expect(Number.isNaN(mediodia('2026-01-00').getTime())).toBe(true)
  })

  test('mediodia arma las 12:00 locales y rechaza basura', () => {
    const d = mediodia('2026-08-01T09:05')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 7, 1, 12])
    expect(mediodia('15/08/2026').getDate()).toBe(15)
    expect(Number.isNaN(mediodia('basura').getTime())).toBe(true)
  })

  test('todayStr y nowStr son del día local aunque UTC ya sea el siguiente', () => {
    const tarde = new Date(2026, 7, 15, 21, 30)
    expect(todayStr(tarde)).toBe('2026-08-15')
    expect(nowStr(tarde)).toBe('2026-08-15T21:30')
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
