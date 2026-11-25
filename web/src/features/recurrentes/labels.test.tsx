import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estado } from '@/test/factories'
import { expectLabels, modalBody } from '@/test/labels'
import { mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { Recurrentes } from '.'

describe('labels', () => {
  it('el form de recurrente se encuentra por sus labels', async () => {
    mockFetch()
    renderWithProviders(<Recurrentes active />, { estado: estado() })
    await userEvent.click(screen.getByText('Nuevo'))
    expectLabels(modalBody(), {
      Nombre: 'm-nombre',
      'Monto (COP)': 'm-monto',
      Frecuencia: 'm-frecuencia',
      'Fecha inicio (opcional)': 'm-fecha',
      'Notas (opcional)': 'm-notas',
    })
    expect(within(modalBody()).getByRole('group', { name: 'Tipo' })).toBeInTheDocument()
  })
})
