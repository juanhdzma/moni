import { describe, expect, it } from 'vitest'
import { entero, formatearCop, formatearCopCorto, pct } from '@/lib/format'

describe('entero', () => {
  it.each([
    [1234.56, '1.235'],
    [1234.4, '1.234'],
    [0.4, '0'],
    [0.5, '1'],
    [-1234.5, '-1.235'],
    [999.5, '1.000'],
    [0, '0'],
    [undefined, '0'],
    [NaN, '0'],
  ])('%s se pinta como %s', (n, esperado) => {
    expect(entero(n)).toBe(esperado)
  })
})

describe('formatearCop', () => {
  it('antepone el símbolo, redondea y tolera null', () => {
    expect(formatearCop(1234.56, '$')).toBe('$1.235')
    expect(formatearCop(null, 'US$')).toBe('US$0')
    expect(formatearCop(undefined, '')).toBe('0')
  })
})

describe('formatearCopCorto', () => {
  it.each([
    [0, '$0'],
    [999, '$999'],
    [1000, '$1k'],
    [1499, '$1k'],
    [1500, '$2k'],
    [999_499, '$999k'],
    [999_999, '$1000k'],
    [1_000_000, '$1,0M'],
    [1_250_000, '$1,3M'],
    [999_999_999, '$1000,0M'],
    [1_000_000_000, '$1,0MM'],
    [2_500_000_000_000, '$2,5B'],
    [12_340_000_000, '$12,3MM'],
    [-999, '−$999'],
    [-1000, '−$1k'],
    [-1_000_000, '−$1,0M'],
    [-1_000_000_000, '−$1,0MM'],
  ])('%d se acorta a %s', (n, esperado) => {
    expect(formatearCopCorto(n, '$')).toBe(esperado)
  })

  it('usa el símbolo recibido en cada escala', () => {
    expect(formatearCopCorto(5, '€')).toBe('€5')
    expect(formatearCopCorto(5_000, '€')).toBe('€5k')
    expect(formatearCopCorto(5_000_000, '€')).toBe('€5,0M')
    expect(formatearCopCorto(5_000_000_000, '€')).toBe('€5,0MM')
  })
})

describe('pct', () => {
  it.each([
    [1234.5, undefined, '1.234,5'],
    [5, 0, '5'],
    [0.05, 1, '0,1'],
    [0.04, 1, '0,0'],
    [-3.456, 2, '-3,46'],
    [undefined, 2, '0,00'],
    [0, undefined, '0,0'],
  ])('pct(%s, %s) = %s', (n, d, esperado) => {
    expect(pct(n, d)).toBe(esperado)
  })
})
