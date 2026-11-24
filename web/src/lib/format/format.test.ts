import { describe, expect, test, beforeEach } from 'vitest'
import {
  cop,
  copShort,
  fmtDate,
  fmtDateShort,
  fmtDateTime,
  fmtMoneyInput,
  numToInput,
  soloFecha,
  parseMoney,
  pct,
  setCurrencySymbol,
} from './index'

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

test('las fechas sueltas se normalizan al formatearlas', () => {
  expect(fmtDate('2026-08-15')).toBe('15/08/2026')
  expect(fmtDateTime('2026-08-15T10:30:00')).toBe('15/08/2026 10:30')
})

test('soloFecha corta la hora y tolera vacíos', () => {
  expect(soloFecha('2026-08-15T10:30')).toBe('2026-08-15')
  expect(soloFecha('2026-08-15')).toBe('2026-08-15')
  expect(soloFecha(null)).toBe('')
  expect(soloFecha(undefined)).toBe('')
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

  test('una fecha inexistente desborda como el parseo viejo (2026-02-31 es 03/03) y fuera de rango se rechaza', () => {
    expect(fmtDate('2026-02-31')).toBe('03/03/2026')
    expect(fmtDateShort('2026-13-01')).toBe('—')
    expect(fmtDateShort('2026-01-32')).toBe('—')
    expect(fmtDateShort('2026-01-00')).toBe('—')
    expect(fmtDateShort('basura')).toBe('—')
  })
})
