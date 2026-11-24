import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BreakdownVariacion } from './BreakdownVariacion'

const props = { id: 'p', idDelta: 'd', idTotal: 't', labelTotal: 'Ganancia total' }

describe('BreakdownVariacion', () => {
  it('muestra las dos filas con el cambio y la variación', () => {
    render(<BreakdownVariacion {...props} visible preview={{ delta: 100, total: 500, total_pct: 10 }} />)
    expect(screen.getByText('Cambio desde último')).toBeInTheDocument()
    expect(screen.getByText('Ganancia total')).toBeInTheDocument()
    expect(document.getElementById('d')).toHaveTextContent('100')
    expect(document.getElementById('t')).toHaveTextContent('500')
    expect(document.getElementById('p')).toHaveClass('visible')
  })

  it('sin preview muestra guiones y oculto si no es visible', () => {
    render(<BreakdownVariacion {...props} visible={false} preview={null} />)
    expect(document.getElementById('d')).toHaveTextContent('—')
    expect(document.getElementById('p')).not.toHaveClass('visible')
  })
})
