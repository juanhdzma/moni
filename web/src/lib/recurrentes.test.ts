import { expect, test, vi, afterEach } from 'vitest'
import { isoDate } from './format'
import { nextPaymentDate, nextPaymentStr, toMensual } from './recurrentes'

const iso = (d: Date | null) => isoDate(d as Date)
const hoy = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y ?? 0, (m ?? 1) - 1, d)
}
const next = (inicio: string, frec: string, dia: string) => nextPaymentDate(inicio, frec, hoy(dia))

afterEach(() => vi.useRealTimers())

test('el pago que cae hoy es hoy, no el período siguiente', () => {
  expect(iso(next('2026-08-01', 'mensual', '2026-08-01'))).toBe('2026-08-01')
})

test('la fecha resultante es medianoche local, no las 19:00 del día anterior', () => {
  const n = next('2026-01-15', 'mensual', '2026-08-01')
  expect(iso(n)).toBe('2026-08-15')
  expect(n?.getHours()).toBe(0)
})

test('el día del mes se mantiene: 31 de enero no se desborda a marzo', () => {
  expect(iso(next('2026-01-31', 'mensual', '2026-02-05'))).toBe('2026-02-28')
  expect(iso(next('2026-01-31', 'mensual', '2026-02-05'))).toBe('2026-02-28')
})

test('meses cortos recortan el día pero no lo pierden', () => {
  expect(iso(next('2026-01-31', 'mensual', '2026-03-01'))).toBe('2026-03-31')
})

test('un inicio a futuro devuelve el inicio, no un período extra', () => {
  expect(iso(next('2026-12-10', 'mensual', '2026-08-01'))).toBe('2026-12-10')
})

test('semanal y quincenal caen en el mismo día de la semana', () => {
  expect(iso(next('2026-07-28', 'semanal', '2026-08-01'))).toBe('2026-08-04')
  expect(iso(next('2026-08-01', 'semanal', '2026-08-01'))).toBe('2026-08-01')
  expect(iso(next('2026-07-20', 'quincenal', '2026-08-01'))).toBe('2026-08-03')
})

test('anual salta al año siguiente cuando ya pasó', () => {
  expect(iso(next('2025-03-10', 'anual', '2026-08-01'))).toBe('2027-03-10')
  expect(iso(next('2025-10-10', 'anual', '2026-08-01'))).toBe('2026-10-10')
})

test('el resultado nunca queda en el pasado', () => {
  const h = new Date(2026, 7, 1)
  for (const frec of ['semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual']) {
    for (const inicio of ['2020-01-01', '2024-02-29', '2026-07-31', '2026-08-01']) {
      const n = nextPaymentDate(inicio, frec, h) as Date
      expect(n >= h, `${frec} desde ${inicio} devolvió ${iso(n)}`).toBe(true)
    }
  }
})

test('frecuencia desconocida o fecha vacía devuelven null', () => {
  expect(next('', 'mensual', '2026-08-01')).toBeNull()
  expect(next('2026-08-01', 'cada rato', '2026-08-01')).toBeNull()
})

test('toMensual normaliza cada frecuencia a un mes', () => {
  expect(toMensual(100, 'mensual')).toBe(100)
  expect(toMensual(100, 'quincenal')).toBe(200)
  expect(toMensual(1200, 'anual')).toBe(100)
  expect(toMensual(100, 'loquesea')).toBe(100)
})

test('sin "hoy" explícito usa la fecha actual', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 1))
  expect(iso(nextPaymentDate('2026-01-15', 'mensual'))).toBe('2026-08-15')
})

test('nextPaymentStr: hoy, en Nd y null', () => {
  expect(nextPaymentStr('2026-08-01', 'mensual', hoy('2026-08-01'))).toBe('hoy')
  expect(nextPaymentStr('2026-01-15', 'mensual', hoy('2026-08-01'))).toBe('en 14d')
  expect(nextPaymentStr('', 'mensual', hoy('2026-08-01'))).toBeNull()
})
