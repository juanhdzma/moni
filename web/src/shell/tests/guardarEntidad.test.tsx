import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { useGuardarEntidad } from '../hooks/useGuardarEntidad'
import type { Recurrente } from '../../types'
import { recurrente } from '../../test/factories'

const DATA = { nombre: 'Luz', tipo: 'gasto' as const, monto: 5, frecuencia: 'mensual', fecha_inicio: '2026-08-01', notas: '' }

function Harness({ item }: { item: Recurrente | null }) {
  const { guardar, eliminar, etiquetaGuardar } = useGuardarEntidad('rec', { item })
  return (
    <>
      <button onClick={() => void guardar(DATA)}>{etiquetaGuardar()}</button>
      {eliminar && <button onClick={eliminar}>borrar</button>}
    </>
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('useGuardarEntidad', () => {
  it('sin item hace POST y etiqueta Agregar, sin borrado', async () => {
    const f = mockFetch({ 'POST /api/rec': {} })
    renderWithProviders(<Harness item={null} />)
    expect(screen.queryByText('borrar')).toBeNull()
    await userEvent.setup().click(screen.getByText('Agregar'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'POST', url: '/api/rec', body: DATA })
  })

  it('con item hace PUT sin id en el body y etiqueta Guardar cambios', async () => {
    const f = mockFetch({ 'PUT /api/rec/4': {} })
    renderWithProviders(<Harness item={recurrente({ id: 4, nombre: 'Luz' })} />)
    await userEvent.setup().click(screen.getByText('Guardar cambios'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'PUT', url: '/api/rec/4', body: DATA })
  })

  it('eliminar confirma con el nombre y borra', async () => {
    const confirmar = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmar)
    const f = mockFetch({ 'DELETE /api/rec/4': null })
    renderWithProviders(<Harness item={recurrente({ id: 4, nombre: 'Luz' })} />)
    await userEvent.setup().click(screen.getByText('borrar'))
    expect(confirmar).toHaveBeenCalledWith('¿Eliminar "Luz"?')
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
  })
})
