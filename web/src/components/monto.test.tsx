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
