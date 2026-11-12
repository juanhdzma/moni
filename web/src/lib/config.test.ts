import { beforeEach, expect, test } from 'vitest'
import {
  addCustomCategory,
  isSystemCategory,
  loadCustomCategories,
  removeCustomCategory,
  systemCategories,
} from './config'

beforeEach(() => localStorage.clear())

test('sin storage solo hay categorías de sistema', () => {
  expect(loadCustomCategories()).toEqual(systemCategories())
})

test('agregar guarda en moni_cats con el mismo formato y se vuelve a cargar', () => {
  const cats = addCustomCategory(systemCategories(), 'gasto', '  Mercado ')
  expect(cats?.gasto).toContain('Mercado')
  expect(JSON.parse(localStorage.getItem('moni_cats') ?? '')).toEqual({ gasto: ['Mercado'] })
  expect(loadCustomCategories().gasto).toContain('Mercado')
})

test('agregar rechaza vacías y repetidas, incluidas las de sistema', () => {
  const base = systemCategories()
  expect(addCustomCategory(base, 'gasto', '   ')).toBeNull()
  expect(addCustomCategory(base, 'gasto', 'Inversión')).toBeNull()
  expect(localStorage.getItem('moni_cats')).toBeNull()
})

test('quitar saca la custom y nunca las de sistema', () => {
  let cats = addCustomCategory(systemCategories(), 'ingreso', 'Freelance') ?? systemCategories()
  cats = removeCustomCategory(cats, 'ingreso', 'Freelance')
  expect(cats.ingreso).not.toContain('Freelance')
  expect(JSON.parse(localStorage.getItem('moni_cats') ?? '')).toEqual({ ingreso: [] })
  expect(removeCustomCategory(cats, 'ingreso', 'Intereses')).toBe(cats)
  expect(isSystemCategory('ingreso', 'Intereses')).toBe(true)
  expect(isSystemCategory('gasto', 'Freelance')).toBe(false)
})

test('un moni_cats corrupto o con tipos ajenos se ignora', () => {
  localStorage.setItem('moni_cats', '{no json')
  expect(loadCustomCategories()).toEqual(systemCategories())
  localStorage.setItem('moni_cats', JSON.stringify({ otro: ['x'], gasto: ['Viajes'] }))
  const cats = loadCustomCategories()
  expect(cats.gasto).toContain('Viajes')
  expect(Object.keys(cats)).toEqual(['ingreso', 'gasto', 'transfer'])
})

test('moni_cats manipulado: solo arreglos de strings por tipo conocido', () => {
  localStorage.setItem('moni_cats', JSON.stringify({ gasto: ['Viajes', 3, null, { a: 1 }], ingreso: 'Freelance', transfer: { x: 1 } }))
  const cats = loadCustomCategories()
  expect(cats.gasto).toEqual([...systemCategories().gasto, 'Viajes'])
  expect(cats.ingreso).toEqual(systemCategories().ingreso)
  expect(cats.transfer).toEqual(systemCategories().transfer)
  localStorage.setItem('moni_cats', JSON.stringify(['gasto']))
  expect(loadCustomCategories()).toEqual(systemCategories())
  localStorage.setItem('moni_cats', 'null')
  expect(loadCustomCategories()).toEqual(systemCategories())
})

test('agregar sobre un moni_cats manipulado reescribe solo datos válidos', () => {
  localStorage.setItem('moni_cats', JSON.stringify({ gasto: 'x', ingreso: ['A', 2] }))
  addCustomCategory(systemCategories(), 'gasto', 'Viajes')
  expect(JSON.parse(localStorage.getItem('moni_cats') ?? '')).toEqual({ ingreso: ['A'], gasto: ['Viajes'] })
})
