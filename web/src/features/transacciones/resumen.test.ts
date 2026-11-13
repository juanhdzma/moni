import { describe, expect, it } from 'vitest'
import { tx } from '../../test/factories'
import { fraseTransacciones } from './resumen'

describe('fraseTransacciones', () => {
  it('is empty without rows', () => {
    expect(fraseTransacciones([], false)).toBe('')
  })

  it('summarizes a positive net', () => {
    const f = fraseTransacciones([tx('ingreso', 'Salario', 1000), tx('gasto', 'Comida', 400)], false)
    expect(f).toContain('2 movimientos')
    expect(f).toContain('te dejaron')
    expect(f).toContain('600')
  })

  it('summarizes a negative net with filters', () => {
    const f = fraseTransacciones([tx('gasto', 'Comida', 400)], true)
    expect(f).toContain('1 movimiento con estos filtros')
    expect(f).toContain('te costaron')
  })
})
