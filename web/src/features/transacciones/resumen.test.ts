import { describe, expect, it } from 'vitest'
import { tx } from '../../test/factories'
import { resumenTx } from './resumen'

describe('resumenTx', () => {
  it('is zero without rows', () => {
    expect(resumenTx([])).toEqual({ ingresos: 0, gastos: 0, neto: 0, categorias: [] })
  })

  it('sums ingresos and gastos and groups gastos by category', () => {
    const r = resumenTx([tx('ingreso', 'Salario', 1000), tx('gasto', 'Comida', 400), tx('gasto', 'Comida', 100), tx('gasto', 'Ocio', 50)])
    expect(r.neto).toBe(450)
    expect(r.categorias).toEqual([
      { key: 'Comida', label: 'Comida', valor: 500 },
      { key: 'Ocio', label: 'Ocio', valor: 50 },
    ])
  })
})
