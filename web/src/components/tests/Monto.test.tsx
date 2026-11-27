import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { describe, expect, it } from 'vitest'
import { pct } from '@/lib/format'
import { Monto, Tendencia, Variacion } from '@/components/Monto'

const POS = { tono: 'positivo', signo: '+' }
const NEG = { tono: 'negativo', signo: '−' }
const CERO = { tono: 'neutro', signo: '' }

describe('tono', () => {
  it('cero es neutro: sin signo, sin flecha y con el chip neutro', () => {
    const { container } = renderWithProviders(<Monto valor={0} {...CERO} chip flecha />)
    expect(screen.getByText('$0')).toHaveClass('bg-muted text-muted-foreground')
    expect(container.querySelector('span svg')).toBeNull()
  })

  it('el tono del backend manda sobre el signo', () => {
    renderWithProviders(<Monto valor={-5000} tono="gasto" signo="−" />)
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
    renderWithProviders(<Monto valor={10} tono={tono} signo="+" />)
    expect(screen.getByText('+$10')).toHaveClass(clase)
  })

  it('negativo usa el chip de deudas', () => {
    renderWithProviders(<Monto valor={-1} {...NEG} chip />)
    expect(screen.getByText('−$1')).toHaveClass('bg-deudas/15 text-deudas')
  })
})

describe('Monto', () => {
  it('muestra el signo del backend, el valor absoluto y el color del tono', () => {
    renderWithProviders(<Monto valor={-1500} {...NEG} />)
    expect(screen.getByText('−$1.500')).toHaveClass('text-deudas')
  })

  it('positivo con sufijo y formato propio', () => {
    renderWithProviders(<Monto valor={12.5} {...POS} formato={pct} sufijo="%" />)
    expect(screen.getByText('+12,5%')).toHaveClass('text-inversiones-text')
  })

  it('no deriva el signo del valor: lo pinta tal como llega', () => {
    renderWithProviders(<Monto valor={10} tono="neutro" signo="" />)
    expect(screen.getByText('$10')).toBeInTheDocument()
  })

  it('variante chip y flecha', () => {
    const { container } = renderWithProviders(<Monto valor={10} {...POS} chip flecha />)
    expect(container.querySelector('span')).toHaveClass('bg-inversiones/15')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('sufijo y formato propio se aplican al valor absoluto', () => {
    renderWithProviders(<Monto valor={-3} {...NEG} formato={(n) => `<${n}>`} sufijo=" pts" />)
    expect(screen.getByText('−<3> pts')).toBeInTheDocument()
  })

  it('sin chip el color es solo texto, sin fondo; con chip lleva el fondo', () => {
    const { rerender } = renderWithProviders(<Monto valor={-10} {...NEG} />)
    expect(screen.getByText('−$10').className).toBe('text-deudas')
    rerender(<Monto valor={-10} {...NEG} chip />)
    expect(screen.getByText('−$10').className).toBe('bg-deudas/15 text-deudas')
  })
})

describe('Monto: cada "cuando"', () => {
  it.each([
    [CERO, 'siempre', '$0'],
    [CERO, 'negativo', '$0'],
    [CERO, 'ninguno', '$0'],
    [POS, 'siempre', '+$10'],
    [POS, 'negativo', '$10'],
    [POS, 'ninguno', '$10'],
    [NEG, 'siempre', '−$10'],
    [NEG, 'negativo', '−$10'],
    [NEG, 'ninguno', '$10'],
  ] as const)('signo %j con mostrarSigno=%s se pinta %s', (backend, mostrarSigno, texto) => {
    renderWithProviders(<Monto valor={backend === CERO ? 0 : 10} {...backend} mostrarSigno={mostrarSigno} color="ninguno" />)
    expect(screen.getByText(texto)).toBeInTheDocument()
  })

  it.each([
    [CERO, 'siempre', 'text-muted-foreground'],
    [CERO, 'negativo', null],
    [CERO, 'ninguno', null],
    [POS, 'siempre', 'text-inversiones-text'],
    [POS, 'negativo', null],
    [POS, 'ninguno', null],
    [NEG, 'siempre', 'text-deudas'],
    [NEG, 'negativo', 'text-deudas'],
    [NEG, 'ninguno', null],
  ] as const)('color %j con color=%s aplica %s', (backend, color, clase) => {
    renderWithProviders(<Monto valor={backend === CERO ? 0 : 10} {...backend} mostrarSigno="ninguno" color={color} className="base" />)
    const el = screen.getByText(backend === CERO ? '$0' : '$10')
    if (clase === null) expect(el.className).toBe('base')
    else expect(el).toHaveClass('base', clase)
  })

  it('el tono negativo activa color=negativo aunque el valor sea positivo', () => {
    renderWithProviders(<Monto valor={10} {...NEG} color="negativo" mostrarSigno="negativo" />)
    expect(screen.getByText('−$10')).toHaveClass('text-deudas')
  })

  it('un tono no negativo no activa color=negativo aunque el valor sea negativo', () => {
    renderWithProviders(<Monto valor={-10} tono="gasto" signo="+" color="negativo" mostrarSigno="negativo" />)
    expect(screen.getByText('$10').className).toBe('')
  })

  it('flecha: sube con +, baja con − y no hay sin signo', () => {
    const { container, rerender } = renderWithProviders(<Monto valor={10} {...POS} flecha />)
    expect(container.querySelector('span svg')).toHaveClass('lucide-arrow-up')
    rerender(<Monto valor={-10} {...NEG} flecha />)
    expect(container.querySelector('span svg')).toHaveClass('lucide-arrow-down')
    rerender(<Monto valor={0} {...CERO} flecha />)
    expect(container.querySelector('span svg')).toBeNull()
  })

  it('por defecto no dibuja flecha', () => {
    const { container } = renderWithProviders(<Monto valor={10} {...POS} />)
    expect(container.querySelector('span svg')).toBeNull()
  })
})

describe('Tendencia', () => {
  it('tiñe el texto del backend según el tono', () => {
    renderWithProviders(<Tendencia {...NEG}>$5k (1,0%) perdido</Tendencia>)
    expect(screen.getByText('$5k (1,0%) perdido')).toHaveClass('text-deudas')
  })
})

describe('Variacion', () => {
  it('el porcentaje comparte tono y signo con el valor', () => {
    renderWithProviders(<Variacion valor={-200} porcentaje={5} {...NEG} />)
    expect(screen.getByText('−$200')).toHaveClass('text-deudas')
    expect(screen.getByText('−5,0%')).toHaveClass('text-deudas')
  })
})
