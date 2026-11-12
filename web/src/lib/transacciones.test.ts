import { expect, test } from 'vitest'
import { tx } from '../test/factories'
import { categoriasDisponibles, listarTransacciones, mesesDisponibles, nextSort, startOfWeek, txDateBucket } from './transacciones'

test('nextSort alterna dirección o arranca por columna con su default', () => {
  expect(nextSort({ col: 'fecha', dir: -1 }, 'fecha')).toEqual({ col: 'fecha', dir: 1 })
  expect(nextSort({ col: 'fecha', dir: -1 }, 'categoria')).toEqual({ col: 'categoria', dir: 1 })
  expect(nextSort({ col: 'categoria', dir: 1 }, 'monto')).toEqual({ col: 'monto', dir: -1 })
})

test('listarTransacciones excluye transfers, ordena y filtra', () => {
  const txs = [
    tx('gasto', 'A', 10, { fecha: '2026-08-02' }),
    tx('ingreso', 'B', 50, { fecha: '2026-07-01' }),
    tx('transfer', 'Pago deuda', 99),
    tx('gasto', 'A', 30, { fecha: '2026-08-05' }),
  ]
  expect(listarTransacciones(txs, { col: 'fecha', dir: -1 }).map((t) => t.monto)).toEqual([30, 10, 50])
  expect(listarTransacciones(txs, { col: 'monto', dir: 1 }).map((t) => t.monto)).toEqual([10, 30, 50])
  expect(listarTransacciones(txs, { col: 'fecha', dir: -1 }, { tipo: 'gasto', mes: '2026-08', cat: 'A' })).toHaveLength(2)
  expect(listarTransacciones(txs, { col: 'fecha', dir: -1 }, { mes: '2026-07' })).toHaveLength(1)
})

test('meses y categorías disponibles', () => {
  const txs = [tx('gasto', 'B', 1, { fecha: '2026-07-01' }), tx('gasto', 'A', 1, { fecha: '2026-08-01' })]
  expect(mesesDisponibles(txs)).toEqual(['2026-08', '2026-07'])
  expect(categoriasDisponibles(txs)).toEqual(['A', 'B'])
})

test('startOfWeek devuelve el lunes', () => {
  expect(startOfWeek(new Date(2026, 7, 16)).getDate()).toBe(10)
  expect(startOfWeek(new Date(2026, 7, 12)).getDate()).toBe(10)
})

test('txDateBucket agrupa por hoy, ayer, semana, mes y mes-año', () => {
  const now = new Date(2026, 7, 20, 15)
  expect(txDateBucket('2026-08-20', now)).toBe('Hoy')
  expect(txDateBucket('2026-08-19T08:00', now)).toBe('Ayer')
  expect(txDateBucket('2026-08-17', now)).toBe('Esta semana')
  expect(txDateBucket('2026-08-05', now)).toBe('Este mes')
  expect(txDateBucket('2026-03-05', now)).toBe('Marzo - 2026')
})
