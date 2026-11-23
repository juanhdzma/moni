import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyCard } from './EmptyCard'

describe('EmptyCard', () => {
  it('muestra título, texto e icono', () => {
    render(<EmptyCard titulo="Sin tarjetas" texto="Agregá una." icono={<svg data-testid="icono" />} />)
    expect(screen.getByText('Sin tarjetas')).toBeInTheDocument()
    expect(screen.getByText('Agregá una.')).toBeInTheDocument()
    expect(screen.getByTestId('icono')).toBeInTheDocument()
  })

  it('puede renderizarse como item de lista y conserva la clase empty', () => {
    render(
      <ul>
        <EmptyCard como="li" titulo="Sin inversiones" />
      </ul>,
    )
    expect(screen.getByRole('listitem')).toHaveClass('empty')
  })
})
