import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { describe, expect, it } from 'vitest'
import { pct } from '@/lib/format'
import { Monto, Tendencia } from './monto'

describe('tono', () => {
  it('cero es neutro: sin signo, sin flecha y con el chip neutro', () => {
    const { container } = renderWithProviders(<Monto valor={0} chip flecha />)
    expect(screen.getByText('$0')).toHaveClass('bg-muted text-muted-foreground')
    expect(container.querySelector('span svg')).toBeNull()
  })

  it('el tono del backend manda sobre el signo', () => {
    renderWithProviders(<Monto valor={-5000} tono="gasto" />)
    expect(screen.getByText('−$5.000')).toHaveClass('text-foreground')
  })

  it.each([
    ['ingreso', 'text-inversiones-text'],
    ['neutro', 'text-muted-foreground'],
    ['deudas', 'text-deudas'],
    ['cartera', 'text-cartera'],
    ['activos', 'text-activos-text'],
    ['desconocido', 'text-muted-foreground'],
  ])('tono %s pinta %s', (tono, clase) => {
    renderWithProviders(<Monto valor={10} tono={tono} />)
    expect(screen.getByText('+$10')).toHaveClass(clase)
  })

  it('negativo usa el chip de deudas', () => {
    renderWithProviders(<Monto valor={-1} chip />)
    expect(screen.getByText('−$1')).toHaveClass('bg-deudas/15 text-deudas')
  })
})

describe('Monto', () => {
  it('muestra signo, valor absoluto y color por defecto', () => {
    renderWithProviders(<Monto valor={-1500} />)
    const el = screen.getByText('−$1.500')
    expect(el).toHaveClass('text-deudas')
  })

  it('positivo con sufijo y formato propio', () => {
    renderWithProviders(<Monto valor={12.5} formato={pct} sufijo="%" />)
    expect(screen.getByText('+12,5%')).toHaveClass('text-inversiones-text')
  })

  it('signo y color solo cuando es negativo', () => {
    const { rerender } = renderWithProviders(<Monto valor={900} signo="negativo" color="negativo" />)
    const el = screen.getByText('$900')
    expect(el).not.toHaveClass('text-deudas')
    rerender(<Monto valor={-900} signo="negativo" color="negativo" />)
    expect(screen.getByText('−$900')).toHaveClass('text-deudas')
  })

  it('sin signo ni color deja solo el número', () => {
    renderWithProviders(<Monto valor={-50} signo="ninguno" color="ninguno" className="x" />)
    const el = screen.getByText('$50')
    expect(el.className).toBe('x')
  })

  it('variante chip y flecha', () => {
    const { container } = renderWithProviders(<Monto valor={10} chip flecha />)
    expect(container.querySelector('span')).toHaveClass('bg-inversiones/15')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('Tendencia', () => {
  it('tiñe el texto del backend según el signo', () => {
    renderWithProviders(<Tendencia valor={-5}>$5k (1,0%) perdido</Tendencia>)
    expect(screen.getByText('$5k (1,0%) perdido')).toHaveClass('text-deudas')
  })
})

describe('Monto: cada "cuando" con cero, positivo y negativo', () => {
  const ROJO = 'text-deudas'
  const VERDE = 'text-inversiones-text'
  const NEUTRO = 'text-muted-foreground'

  it.each([
    [0, 'siempre', '$0'],
    [0, 'negativo', '$0'],
    [0, 'ninguno', '$0'],
    [10, 'siempre', '+$10'],
    [10, 'negativo', '$10'],
    [10, 'ninguno', '$10'],
    [-10, 'siempre', '−$10'],
    [-10, 'negativo', '−$10'],
    [-10, 'ninguno', '$10'],
  ] as const)('signo: valor %d con signo=%s se pinta %s', (valor, signo, texto) => {
    renderWithProviders(<Monto valor={valor} signo={signo} color="ninguno" />)
    expect(screen.getByText(texto)).toBeInTheDocument()
  })

  it.each([
    [0, 'siempre', NEUTRO],
    [0, 'negativo', null],
    [0, 'ninguno', null],
    [10, 'siempre', VERDE],
    [10, 'negativo', null],
    [10, 'ninguno', null],
    [-10, 'siempre', ROJO],
    [-10, 'negativo', ROJO],
    [-10, 'ninguno', null],
  ] as const)('color: valor %d con color=%s aplica %s', (valor, color, clase) => {
    renderWithProviders(<Monto valor={valor} signo="ninguno" color={color} className="base" />)
    const el = screen.getByText(valor === 0 ? '$0' : '$10')
    if (clase === null) expect(el.className).toBe('base')
    else expect(el).toHaveClass('base', clase)
  })

  it('el tono del backend negativo activa color=negativo aunque el valor sea positivo', () => {
    renderWithProviders(<Monto valor={10} tono="negativo" color="negativo" signo="negativo" />)
    const el = screen.getByText('$10')
    expect(el).toHaveClass(ROJO)
  })

  it('el tono del backend no negativo no activa color=negativo aunque el valor sea negativo', () => {
    renderWithProviders(<Monto valor={-10} tono="gasto" color="negativo" signo="negativo" />)
    const el = screen.getByText('−$10')
    expect(el.className).toBe('')
  })

  it('flecha: sube con positivo, baja con negativo y no hay con cero', () => {
    const { container, rerender } = renderWithProviders(<Monto valor={10} flecha />)
    expect(container.querySelector('span svg')).toHaveClass('lucide-arrow-up')
    rerender(<Monto valor={-10} flecha />)
    expect(container.querySelector('span svg')).toHaveClass('lucide-arrow-down')
    rerender(<Monto valor={0} flecha />)
    expect(container.querySelector('span svg')).toBeNull()
  })

  it('por defecto no dibuja flecha', () => {
    const { container } = renderWithProviders(<Monto valor={10} />)
    expect(container.querySelector('span svg')).toBeNull()
  })

  it('sin chip el color es solo texto, sin fondo; con chip lleva el fondo', () => {
    const { rerender } = renderWithProviders(<Monto valor={-10} />)
    expect(screen.getByText('−$10').className).toBe(ROJO)
    rerender(<Monto valor={-10} chip />)
    expect(screen.getByText('−$10').className).toBe('bg-deudas/15 text-deudas')
  })

  it('sufijo y formato propio se aplican al valor absoluto', () => {
    renderWithProviders(<Monto valor={-3} formato={(n) => `<${n}>`} sufijo=" pts" />)
    expect(screen.getByText('−<3> pts')).toBeInTheDocument()
  })
})
