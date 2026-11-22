import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoriasBase, estado } from '../test/factories'
import { failure, mockFetch } from '../test/mockFetch'
import { renderWithProviders } from '../test/render'
import { useCategorias } from './CategoriasProvider'
import { useData } from './DataProvider'

function Harness() {
  const { categorias, esSistema, addCategoria, removeCategoria } = useCategorias()
  const { banner } = useData()
  return (
    <>
      <output data-testid="gasto">{categorias.gasto.join('|')}</output>
      <output data-testid="sistema">{String(esSistema('gasto', 'Inversión'))}</output>
      <output data-testid="custom">{String(esSistema('gasto', 'Mascotas'))}</output>
      <output data-testid="banner">{banner}</output>
      <button onClick={() => void addCategoria('gasto', 'Mascotas')}>add</button>
      <button onClick={() => void removeCategoria('gasto', 'Mascotas')}>del</button>
    </>
  )
}

const conMascotas = () => {
  const c = categoriasBase()
  c.gasto.push({ nombre: 'Mascotas', sistema: false })
  return estado({ categorias: c })
}

afterEach(() => vi.unstubAllGlobals())

describe('CategoriasProvider', () => {
  it('expone nombres y sistema desde estado.categorias', () => {
    renderWithProviders(<Harness />, { estado: conMascotas() })
    expect(screen.getByTestId('gasto')).toHaveTextContent('Inversión|Compra activos|Mascotas')
    expect(screen.getByTestId('sistema')).toHaveTextContent('true')
    expect(screen.getByTestId('custom')).toHaveTextContent('false')
  })

  it('agregar hace POST /api/categorias y recarga /api/all', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/categorias': categoriasBase() })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('add'))
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
    const [post] = f.callsTo('POST', '/api/categorias')
    expect(post?.headers['X-Moni-Request']).toBe('1')
    expect(post?.body).toEqual({ tipo: 'gasto', nombre: 'Mascotas' })
  })

  it('quitar hace DELETE con tipo y nombre en el query', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'DELETE /api/categorias?tipo=gasto&nombre=Mascotas': categoriasBase() })
    renderWithProviders(<Harness />, { estado: conMascotas() })
    await user.click(screen.getByText('del'))
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
    expect(f.mutations()).toMatchObject([{ method: 'DELETE', headers: { 'X-Moni-Request': '1' } }])
  })

  it('un 409 muestra el banner y no recarga', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/categorias': failure(409, 'ya existe') })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('ya existe'))
    expect(f.callsTo('GET', '/api/all')).toHaveLength(0)
  })
})
