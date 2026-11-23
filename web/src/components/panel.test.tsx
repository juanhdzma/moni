import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Desactualizado } from './panel'

describe('Desactualizado', () => {
  it('shows the explanation on tap and hides it on blur', async () => {
    render(<Desactualizado texto="Valor sin actualizar hace más de 1 mes" />)
    const tip = screen.getByRole('tooltip', { hidden: true })
    expect(tip).toHaveClass('sr-only')
    await userEvent.click(screen.getByRole('button'))
    expect(tip).not.toHaveClass('sr-only')
    await userEvent.tab()
    expect(tip).toHaveClass('sr-only')
  })
})
