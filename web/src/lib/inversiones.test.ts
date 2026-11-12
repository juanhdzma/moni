import { expect, test } from 'vitest'
import { cambioValor, eaToMv, mvToEa, nextInvPaymentDate, nextInvPaymentStr, rendimientoMensualFija, tasaEaDesdeInput } from './inversiones'

test('EA y MV son inversas', () => {
  expect(mvToEa(eaToMv(12.5))).toBeCloseTo(12.5, 10)
  expect(eaToMv(0)).toBe(0)
})

test('tasaEaDesdeInput convierte MV a EA y descarta vacío o cero', () => {
  expect(tasaEaDesdeInput('12', 'ea')).toBe(12)
  expect(tasaEaDesdeInput('1', 'mv')).toBeCloseTo(mvToEa(1))
  expect(tasaEaDesdeInput('', 'ea')).toBeNull()
  expect(tasaEaDesdeInput('0', 'ea')).toBeNull()
})

test('nextInvPaymentStr: hoy, este mes, el próximo y sin día', () => {
  const h = new Date(2026, 7, 15)
  expect(nextInvPaymentStr(15, h)).toBe('hoy')
  expect(nextInvPaymentStr(20, h)).toBe('en 5d')
  expect(nextInvPaymentStr(10, h)).toBe('en 26d')
  expect(nextInvPaymentStr(null, h)).toBeNull()
})

test('rendimientoMensualFija redondea a pesos', () => {
  const mv = eaToMv(12)
  expect(rendimientoMensualFija(1_000_000, 12)).toBe(Math.round((1_000_000 * mv) / 100))
})

test('cambioValor: delta, ganancia total y porcentaje', () => {
  expect(cambioValor(1_100, 1_050, 1_000)).toEqual({ delta: 50, total: 100, totalPct: 10 })
  expect(cambioValor(500, 600, 0)).toEqual({ delta: -100, total: 500, totalPct: 0 })
})

test('nextInvPaymentDate recorta el día 29-31 al último del mes en vez de desbordar', () => {
  expect(nextInvPaymentDate(31, new Date(2026, 1, 10))).toEqual(new Date(2026, 1, 28))
  expect(nextInvPaymentDate(31, new Date(2026, 3, 30, 15))).toEqual(new Date(2026, 3, 30))
  expect(nextInvPaymentDate(30, new Date(2026, 0, 31))).toEqual(new Date(2026, 1, 28))
  expect(nextInvPaymentStr(31, new Date(2026, 1, 28))).toBe('hoy')
  expect(nextInvPaymentStr(31, new Date(2026, 3, 30))).toBe('hoy')
})
