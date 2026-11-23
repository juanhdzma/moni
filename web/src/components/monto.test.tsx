import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { pct } from '@/lib/format'
import { Monto, Tendencia, tonoDe } from './monto'

describe('tonoDe', () => {
  it('cero cuenta como positivo', () => {
    expect(tonoDe(0)).toMatchObject({ positivo: true, signo: '+', texto: 'text-inversiones-text' })
    expect(tonoDe(-1)).toMatchObject({ positivo: false, signo: '−', texto: 'text-deudas', chip: 'bg-deudas/15 text-deudas' })
  })
})

describe('Monto', () => {
  it('muestra signo, valor absoluto y color por defecto', () => {
    render(<Monto valor={-1500} />)
    const el = screen.getByText('−$1.500')
    expect(el).toHaveClass('text-deudas')
  })

  it('positivo con sufijo y formato propio', () => {
    render(<Monto valor={12.5} formato={pct} sufijo="%" />)
    expect(screen.getByText('+12,5%')).toHaveClass('text-inversiones-text')
  })

  it('signo y color solo cuando es negativo', () => {
    const { rerender } = render(<Monto valor={900} signo="negativo" color="negativo" />)
    const el = screen.getByText('$900')
    expect(el).not.toHaveClass('text-deudas')
    rerender(<Monto valor={-900} signo="negativo" color="negativo" />)
    expect(screen.getByText('−$900')).toHaveClass('text-deudas')
  })

  it('sin signo ni color deja solo el número', () => {
    render(<Monto valor={-50} signo="ninguno" color="ninguno" className="x" />)
    const el = screen.getByText('$50')
    expect(el.className).toBe('x')
  })

  it('variante chip y flecha', () => {
    const { container } = render(<Monto valor={10} chip flecha />)
    expect(container.firstElementChild).toHaveClass('bg-inversiones/15')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('Tendencia', () => {
  it('tiñe el texto del backend según el signo', () => {
    render(<Tendencia valor={-5}>$5k (1,0%) perdido</Tendencia>)
    expect(screen.getByText('$5k (1,0%) perdido')).toHaveClass('text-deudas')
  })
})
