import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '@/test/mockFetch'
import { META } from '@/test/meta'
import { renderWithProviders } from '@/test/render'
import { TxForm } from '@/features/transacciones/forms/TxForm'

afterEach(() => vi.unstubAllGlobals())

describe('CamposTx', () => {
  it('limita la descripción con meta.limites.descripcion', async () => {
    mockFetch()
    renderWithProviders(<TxForm tx={null} />)
    await waitFor(() => expect(document.getElementById('m-desc')).toHaveAttribute('maxlength', String(META.limites.descripcion)))
  })

  it('Enter al crear una categoría solo la crea: no guarda el movimiento', async () => {
    const f = mockFetch({ 'POST /api/categorias': { gasto: ['Mascotas'], ingreso: [] } })
    const user = userEvent.setup()
    renderWithProviders(<TxForm tx={null} />)
    await user.click(await screen.findByRole('button', { name: 'Agregar categoría' }))
    await user.type(document.getElementById('new-cat-name') as HTMLElement, 'Mascotas{Enter}')
    await waitFor(() => expect(f.callsTo('POST', '/api/categorias')).toHaveLength(1))
    expect(f.callsTo('POST', '/api/tx')).toHaveLength(0)
  })
})
