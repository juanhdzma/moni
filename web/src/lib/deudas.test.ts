import { expect, test } from 'vitest'
import { comisionAdelanto, desglosePago, estimarInteresesPagados, fmtIntereses, interesesPagados } from './deudas'

test('estimarInteresesPagados devuelve null sin datos o sin pagos', () => {
  expect(estimarInteresesPagados(1000, 1000, 20, 100)).toBeNull()
  expect(estimarInteresesPagados(1000, 500, 0, 100)).toBeNull()
  expect(estimarInteresesPagados(0, 0, 20, 100)).toBeNull()
})

test('estimarInteresesPagados amortiza mes a mes', () => {
  const r = estimarInteresesPagados(1_000_000, 500_000, 24, 100_000)
  expect(r).toBeGreaterThan(0)
  expect(r).toBe(Math.round(r as number))
})

test('estimarInteresesPagados corta si la cuota no cubre el interés', () => {
  expect(estimarInteresesPagados(1_000_000, 900_000, 60, 1_000)).toBe(0)
})

test('interesesPagados prefiere el exacto del backend; el estimado va con ~', () => {
  const base = { monto_inicial: 1_000_000, saldo_actual: 500_000, tasa_ea: 24, cuota_mensual: 100_000 }
  expect(interesesPagados({ ...base, total_intereses: 42_000 })).toEqual({ valor: 42_000, exacto: true })
  const est = interesesPagados({ ...base, total_intereses: 0 })
  expect(est?.exacto).toBe(false)
  expect(fmtIntereses({ valor: 42_000, exacto: true })).toBe('$42.000')
  expect(fmtIntereses({ valor: 42_000, exacto: false })).toBe('~$42.000')
  expect(interesesPagados({ ...base, saldo_actual: 1_000_000, total_intereses: 0 })).toBeNull()
})

test('desglosePago separa capital e intereses sin negativos', () => {
  expect(desglosePago(1_000_000, 150_000, 900_000)).toEqual({ capital: 100_000, intereses: 50_000 })
  expect(desglosePago(1_000_000, 50_000, 900_000)).toEqual({ capital: 100_000, intereses: 0 })
  expect(desglosePago(100, 50, 200)).toEqual({ capital: 0, intereses: 50 })
})

test('comisionAdelanto es lo que sube la deuda por encima del monto', () => {
  expect(comisionAdelanto(1_000_000, 500_000, 1_520_000)).toBe(20_000)
  expect(comisionAdelanto(1_000_000, 500_000, 1_500_000)).toBe(0)
  expect(comisionAdelanto(1_000_000, 500_000, 1_400_000)).toBe(0)
})
