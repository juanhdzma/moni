import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MoneyField } from './MoneyField'

function Harness({ hint }: { hint?: string }) {
  const [v, setV] = useState('')
  return <MoneyField id="m-monto" label="Monto" value={v} onChange={setV} hint={hint} />
}

describe('MoneyField', () => {
  it('asocia el label al input y formatea miles', async () => {
    renderWithProviders(<Harness />)
    await userEvent.type(screen.getByLabelText('Monto'), '1234567')
    expect(screen.getByLabelText('Monto')).toHaveValue('1.234.567')
  })

  it('el hint es opcional', () => {
    const { rerender } = renderWithProviders(<Harness />)
    expect(screen.queryByText('Ayuda')).toBeNull()
    rerender(<Harness hint="Ayuda" />)
    expect(screen.getByText('Ayuda')).toBeInTheDocument()
  })
})
