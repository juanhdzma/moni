import { expect, test } from 'vitest'
import { escalaUnidad, fmtUnidad, partirFiguras, pictoCategoria } from './isotipo'

test('la unidad es un número redondo que deja la fila más larga en 20 figuras o menos', () => {
  expect(escalaUnidad([320_000, 150_000, 60_000])).toBe(20_000)
  expect(escalaUnidad([422_000_000, 19_000_000, 6_300_000, -153_200_000])).toBe(50_000_000)
  expect(escalaUnidad([1_000_000])).toBe(50_000)
  expect(escalaUnidad([0, 0])).toBe(1)
  expect(escalaUnidad([])).toBe(1)
})

test('una cantidad se parte en figuras enteras y el resto se redondea a media figura', () => {
  expect(partirFiguras(320_000, 20_000)).toEqual({ enteras: 16, resto: 0 })
  expect(partirFiguras(150_000, 20_000)).toEqual({ enteras: 7, resto: 0.5 })
  expect(partirFiguras(-60_000, 20_000)).toEqual({ enteras: 3, resto: 0 })
  expect(partirFiguras(104_000, 20_000)).toEqual({ enteras: 5, resto: 0 })
  expect(partirFiguras(107_000, 20_000)).toEqual({ enteras: 5, resto: 0.5 })
  expect(partirFiguras(116_000, 20_000)).toEqual({ enteras: 6, resto: 0 })
})

test('una cantidad chica igual deja media figura visible', () => {
  expect(partirFiguras(500, 20_000)).toEqual({ enteras: 0, resto: 0.5 })
  expect(partirFiguras(19_000, 20_000)).toEqual({ enteras: 1, resto: 0 })
  expect(partirFiguras(0, 20_000)).toEqual({ enteras: 0, resto: 0 })
})

test('la unidad se escribe corta', () => {
  expect(fmtUnidad(20_000)).toBe('$20k')
  expect(fmtUnidad(50_000_000)).toBe('$50M')
  expect(fmtUnidad(2_000_000_000)).toBe('$2B')
  expect(fmtUnidad(500)).toBe('$500')
})

test('cada categoría de gasto tiene su pictograma, con moneda por defecto', () => {
  expect(pictoCategoria('Alimentación')).toBe('cubiertos')
  expect(pictoCategoria('Transporte')).toBe('carro')
  expect(pictoCategoria('Arriendo')).toBe('casa')
  expect(pictoCategoria('Compra activos')).toBe('casa')
  expect(pictoCategoria('Inversión')).toBe('planta')
  expect(pictoCategoria('Entretenimiento')).toBe('boleta')
  expect(pictoCategoria('Mascotas')).toBe('moneda')
})
