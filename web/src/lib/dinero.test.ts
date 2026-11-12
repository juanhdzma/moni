import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { tieneSaldo } from './config'
import {
  agruparGastos,
  flujoCartera,
  flujoPatrimonio,
  gastosTxInPeriod,
  monthLabels,
  monthlyInvDelta,
  monthlyPatrimonio,
  netWorth,
  periodMonths,
  redHeat,
  resumenDashboard,
  serieHaciaAtras,
  transaccionesRecientes,
} from './dinero'
import { activo, deuda, estado, inversion, tx } from '../test/factories'

const AHORA = new Date(2026, 7, 15)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(AHORA)
})
afterEach(() => vi.useRealTimers())

test('la cartera ignora los gastos con tarjeta y descuenta los transfers', () => {
  const lista = [
    tx('ingreso', 'Salario', 5_000_000),
    tx('gasto', 'Mercado', 300_000),
    tx('gasto', 'Ropa', 200_000, { tarjeta_id: 1 }),
    tx('transfer', 'Pago deuda', 1_000_000),
  ]
  expect(flujoCartera(lista)).toBe(5_000_000 - 300_000 - 1_000_000)
})

test('el patrimonio sí descuenta el gasto con tarjeta: sube la deuda', () => {
  expect(flujoPatrimonio([tx('gasto', 'Ropa', 200_000, { tarjeta_id: 1 })])).toBe(-200_000)
})

test('pagar una deuda no cambia el patrimonio', () => {
  expect(flujoPatrimonio([tx('transfer', 'Pago deuda', 1_000_000)])).toBe(0)
})

test('mover plata entre bolsillos no cambia el patrimonio', () => {
  const neutras = [
    tx('gasto', 'Inversión', 500_000),
    tx('gasto', 'Compra activos', 900_000),
    tx('ingreso', 'Crédito recibido', 2_000_000),
    tx('ingreso', 'Avance de tarjeta', 300_000),
    tx('ingreso', 'Venta activos', 900_000),
    tx('ingreso', 'Dividendos', 100_000),
  ]
  expect(flujoPatrimonio(neutras)).toBe(0)
  for (const t of neutras) expect(flujoPatrimonio([t]), t.categoria).toBe(0)
})

test('ingresos y gastos normales sí mueven el patrimonio', () => {
  expect(flujoPatrimonio([tx('ingreso', 'Salario', 5_000_000), tx('gasto', 'Mercado', 300_000)])).toBe(4_700_000)
})

test('la curva de evolución cierra en el patrimonio actual', () => {
  const e = estado({
    transacciones: [
      tx('ingreso', 'Salario', 5_000_000, { fecha: '2026-07-10' }),
      tx('gasto', 'Mercado', 300_000, { fecha: '2026-08-02' }),
      tx('transfer', 'Pago deuda', 1_000_000, { fecha: '2026-08-05' }),
    ],
    deudas: [deuda({ saldo_actual: 2_000_000 })],
    inversiones: [inversion({ valor_actual: 1_500_000 })],
  })

  const patrimonio = netWorth(e)
  const deltas = monthlyPatrimonio(e.transacciones, 3)
  const data = serieHaciaAtras(patrimonio, deltas)

  expect(data[2]).toBe(patrimonio)
  expect(deltas[2]).toBe(-300_000)
  expect(data[1]).toBe(patrimonio + 300_000)
  expect(data[0]).toBe(patrimonio + 300_000 - 5_000_000)
})

test('la serie mensual respeta la ventana de meses', () => {
  const txs = [
    tx('ingreso', 'Salario', 1_000, { fecha: '2026-08-03' }),
    tx('ingreso', 'Salario', 2_000, { fecha: '2026-07-03' }),
    tx('ingreso', 'Salario', 4_000, { fecha: '2026-05-03' }),
  ]
  expect(monthlyPatrimonio(txs, 3)).toEqual([0, 2_000, 1_000])
})

test('un residuo flotante no mantiene viva una deuda pagada', () => {
  expect(tieneSaldo({ saldo_actual: 1.16e-10 })).toBe(false)
  expect(tieneSaldo({ saldo_actual: 0 })).toBe(false)
  expect(tieneSaldo({ saldo_actual: 0.4 })).toBe(false)
  expect(tieneSaldo({ saldo_actual: 1 })).toBe(true)
  expect(tieneSaldo({ saldo_actual: 250_000 })).toBe(true)
})

test('el rendimiento no infla el patrimonio por los dos lados', () => {
  const pagado = estado({
    transacciones: [tx('ingreso', 'Intereses', 95_000)],
    inversiones: [inversion({ valor_actual: 1_000_000 })],
  })
  expect(netWorth(pagado)).toBe(1_095_000)

  const capitalizado = estado({ inversiones: [inversion({ valor_actual: 1_095_000 })] })
  expect(netWorth(capitalizado)).toBe(1_095_000)
})

test('la curva de inversiones sigue los aportes y los retiros, no los rendimientos', () => {
  const txs = [
    tx('gasto', 'Inversión', 500_000, { fecha: '2026-08-04' }),
    tx('ingreso', 'Dividendos', 200_000, { fecha: '2026-08-06' }),
    tx('ingreso', 'Intereses', 95_000, { fecha: '2026-08-08' }),
  ]
  expect(monthlyInvDelta(txs, 2)).toEqual([0, 300_000])
})

test('netWorth suma activos y resta deudas', () => {
  const e = estado({
    activos: [activo({ valor_actual: 10_000_000 })],
    deudas: [deuda({ saldo_actual: 4_000_000 })],
  })
  expect(netWorth(e)).toBe(6_000_000)
})

test('periodMonths: periodos fijos y "todo" desde la fecha más antigua sin correr el mes', () => {
  expect(periodMonths('1M')).toBe(2)
  expect(periodMonths('3M')).toBe(3)
  expect(periodMonths('6M')).toBe(6)
  expect(periodMonths('1Y')).toBe(12)
  expect(periodMonths('ALL', [])).toBe(6)
  expect(periodMonths('ALL', ['2026-08-01'])).toBe(2)
  expect(periodMonths('ALL', ['2026-03-01', '2026-08-01', null, ''])).toBe(6)
  expect(periodMonths('ALL', ['2025-08-01'])).toBe(13)
})

test('monthLabels arranca count-1 meses atrás', () => {
  expect(monthLabels(3)).toHaveLength(3)
  expect(monthLabels(1)).toEqual([new Date(2026, 7, 1).toLocaleDateString('es-CO', { month: 'short' })])
})

test('resumenDashboard: KPIs del mes y ahorro acotado al mes', () => {
  const e = estado({
    transacciones: [
      tx('ingreso', 'Salario', 5_000_000, { fecha: '2026-07-10' }),
      tx('ingreso', 'Salario', 1_000_000, { fecha: '2026-08-02' }),
      tx('gasto', 'Mercado', 250_000, { fecha: '2026-08-03' }),
      tx('gasto', 'Ropa', 100_000, { fecha: '2026-08-04', tarjeta_id: 1 }),
    ],
    deudas: [deuda({ saldo_actual: 500_000, cuota_mensual: 50_000 }), deuda({ saldo_actual: 0.2, cuota_mensual: 9 })],
    inversiones: [inversion({ monto_invertido: 1_000_000, valor_actual: 1_100_000 })],
  })
  const r = resumenDashboard(e, AHORA)
  expect(r.ingresos).toBe(1_000_000)
  expect(r.gastos).toBe(250_000)
  expect(r.ahorroPct).toBe(75)
  expect(r.efectivo).toBe(5_000_000 + 1_000_000 - 250_000)
  expect(r.deudasActivas).toHaveLength(1)
  expect(r.cuotaTotal).toBe(50_000)
  expect(r.gananciaInv).toBe(100_000)
  expect(r.ganPct).toBeCloseTo(10)
})

test('resumenDashboard sin ingresos del mes no divide por cero', () => {
  const r = resumenDashboard(estado(), AHORA)
  expect(r.ahorroPct).toBe(0)
  expect(r.ganPct).toBe(0)
  expect(r.proyDelta).toBe(0)
})

test('transaccionesRecientes ordena por fecha desc y corta en n', () => {
  const txs = [
    tx('gasto', 'a', 1, { fecha: '2026-01-01' }),
    tx('gasto', 'b', 1, { fecha: '2026-03-01' }),
    tx('gasto', 'c', 1, { fecha: '2026-02-01' }),
  ]
  expect(transaccionesRecientes(txs, 2).map((t) => t.categoria)).toEqual(['b', 'c'])
})

test('gastosTxInPeriod: ventana inclusiva en hora local y recorte de día', () => {
  const g = (fecha: string) => tx('gasto', 'x', 1, { fecha })
  const txs = [g('2026-07-15'), g('2026-07-14'), g('2026-08-14T10:00'), tx('ingreso', 'x', 1, { fecha: '2026-08-14' })]
  expect(gastosTxInPeriod(txs, '1M', AHORA).map((t) => t.fecha)).toEqual(['2026-07-15', '2026-08-14T10:00'])
  expect(gastosTxInPeriod(txs, 'ALL', AHORA)).toHaveLength(3)
  expect(gastosTxInPeriod(txs, '1W', AHORA).map((t) => t.fecha)).toEqual(['2026-08-14T10:00'])
  const finMes = gastosTxInPeriod([g('2026-02-28'), g('2026-02-27')], '1M', new Date(2026, 2, 31))
  expect(finMes.map((t) => t.fecha)).toEqual(['2026-02-28'])
})

test('agruparGastos suma por categoría y ordena de mayor a menor', () => {
  const { entries, porCategoria } = agruparGastos([
    tx('gasto', 'A', 10),
    tx('gasto', 'B', 50),
    tx('gasto', 'A', 15),
    tx('gasto', '', 1),
  ])
  expect(entries).toEqual([['B', 50], ['A', 25], ['Otros', 1]])
  expect(porCategoria.A).toHaveLength(2)
})

test('redHeat interpola la luminosidad', () => {
  expect(redHeat(0)).toBe('hsl(7, 64%, 86%)')
  expect(redHeat(1)).toBe('hsl(7, 64%, 30%)')
})
