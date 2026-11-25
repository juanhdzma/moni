import { describe, expect, it } from 'vitest'
import { fmtMoneyInput, parseMoney } from './index'

function input(value: string, caret: number | null = value.length) {
  return {
    value,
    selectionStart: caret,
    setSelectionRange(a: number) {
      this.selectionStart = a
    },
  }
}

describe('fmtMoneyInput con separadores', () => {
  it.each([
    ['1,2,3', '1'],
    ['1,23,4,5', '1'],
    ['1.234,56', '1.234'],
    ['12345,', '12.345'],
    [',5', ''],
    ['', ''],
    ['abc', ''],
    ['1.2.3.4', '1.234'],
    ['-5', '5'],
    ['1234567890', '1.234.567.890'],
    ['100', '100'],
    ['1000', '1.000'],
  ])('%j queda como %j', (entrada, esperado) => {
    const el = input(entrada)
    fmtMoneyInput(el)
    expect(el.value).toBe(esperado)
  })

  it('sin selectionStart el caret termina al final', () => {
    const el = input('1234567', null)
    fmtMoneyInput(el)
    expect(el.value).toBe('1.234.567')
    expect(el.selectionStart).toBe(9)
  })

  it('con varias comas el caret queda dentro del valor ya recortado', () => {
    const el = input('1,2,3')
    fmtMoneyInput(el)
    expect(el.selectionStart).toBe(1)
  })

  it('borrar hasta vacío deja caret en 0', () => {
    const el = input('', 0)
    fmtMoneyInput(el)
    expect(el.selectionStart).toBe(0)
  })
})

describe('parseMoney', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['1,2,3', 1.2],
    ['abc', 0],
    ['-5', -5],
    ['1.000.000', 1_000_000],
    ['0,5', 0.5],
    [',', 0],
    ['   ', 0],
  ])('%j da %d', (entrada, esperado) => {
    expect(parseMoney(entrada)).toBe(esperado)
  })
})
