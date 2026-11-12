import { beforeEach, expect, test } from 'vitest'
import { deuda, inversion, recurrente } from '../test/factories'
import {
  calcularProximasOperaciones,
  loadSkippedOps,
  proxOpKey,
  restoreAllOps,
  restoreOp,
  saveSkippedOps,
  skipOp,
  textoDias,
  visibles,
  diasHasta,
} from './proximasOps'

const HOY = new Date(2026, 7, 15)

beforeEach(() => localStorage.clear())

test('la clave tiene el formato tipo:id:fecha', () => {
  expect(proxOpKey('deuda', 3, '2026-08-20')).toBe('deuda:3:2026-08-20')
})

test('skip, restore y restore all usan moni_skipped_ops como arreglo JSON', () => {
  skipOp('a')
  skipOp('b')
  expect(JSON.parse(localStorage.getItem('moni_skipped_ops') ?? '')).toEqual(['a', 'b'])
  restoreOp('a')
  expect([...loadSkippedOps()]).toEqual(['b'])
  restoreAllOps()
  expect(loadSkippedOps().size).toBe(0)
})

test('un storage corrupto equivale a vacío', () => {
  localStorage.setItem('moni_skipped_ops', 'xx')
  expect(loadSkippedOps().size).toBe(0)
})

test('junta cuotas, rendimientos y recurrentes dentro de la ventana, ordenados por fecha', () => {
  const ops = calcularProximasOperaciones(
    {
      deudas: [
        deuda({ _id: 1, nombre: 'Carro', saldo_actual: 5_000_000, cuota_mensual: 400_000, proxima_cuota: '2026-08-25' }),
        deuda({ _id: 2, nombre: 'Saldada', saldo_actual: 0, proxima_cuota: '2026-08-20' }),
        deuda({ _id: 3, nombre: 'Muy vieja', saldo_actual: 100, cuota_mensual: 1, proxima_cuota: '2026-07-01' }),
        deuda({ _id: 4, nombre: 'Vencida', saldo_actual: 100_000, cuota_mensual: 10, proxima_cuota: '2026-08-10' }),
      ],
      inversiones: [
        inversion({ _id: 5, nombre: 'CDT', tipo: 'fija', pago: 'mensual', dia_pago: 20, tasa_ea: 12, monto_invertido: 1_000_000 }),
        inversion({ _id: 6, nombre: 'Sin pago', tipo: 'fija', pago: 'vencimiento', dia_pago: 20, tasa_ea: 12 }),
      ],
      recurrentes: [
        recurrente({ _id: 7, nombre: 'Netflix', monto: 30_000, frecuencia: 'mensual', fecha_inicio: '2026-01-18' }),
        recurrente({ _id: 8, nombre: 'Sueldo', tipo: 'ingreso', monto: 5_000_000, frecuencia: 'quincenal', fecha_inicio: '2026-08-01' }),
        recurrente({ _id: 9, nombre: 'Pausado', activo: false, fecha_inicio: '2026-01-18' }),
      ],
    },
    HOY,
  )
  expect(ops.map((o) => o.key)).toEqual([
    'deuda:4:2026-08-10',
    'recurrente:8:2026-08-15',
    'recurrente:7:2026-08-18',
    'inversion:5:2026-08-20',
    'deuda:1:2026-08-25',
  ])
  expect(ops.find((o) => o.type === 'deuda' && o.sourceId === 1)?.monto).toBe(-400_000)
  expect(ops.find((o) => o.type === 'recurrente' && o.sourceId === 8)?.monto).toBe(5_000_000)
  expect(ops.find((o) => o.type === 'inversion')?.monto).toBe(9_489)
})

test('visibles oculta las saltadas y poda las claves que ya no son candidatas', () => {
  const ops = calcularProximasOperaciones(
    { deudas: [deuda({ _id: 1, saldo_actual: 100, proxima_cuota: '2026-08-20' })], inversiones: [], recurrentes: [] },
    HOY,
  )
  saveSkippedOps(new Set(['deuda:1:2026-08-20', 'deuda:9:2026-01-01']))
  expect(visibles(ops)).toEqual([])
  expect([...loadSkippedOps()]).toEqual(['deuda:1:2026-08-20'])
})

test('textoDias y diasHasta', () => {
  expect(textoDias(0)).toBe('hoy')
  expect(textoDias(1)).toBe('mañana')
  expect(textoDias(-3)).toBe('vencido 3d')
  expect(textoDias(7)).toBe('en 7d')
  expect(diasHasta(new Date(2026, 7, 20), HOY)).toBe(5)
})
