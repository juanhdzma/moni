import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { failure, mockFetch } from '../test/mockFetch'
import { renderWithProviders } from '../test/render'
import { useData } from './DataProvider'
import { useMutations } from './useMutations'
import { deuda } from '../test/factories'

function Harness() {
  const { crudOp, crudOpOrBanner, apiAction } = useMutations()
  const { banner } = useData()
  const err = (e: unknown) => document.body.setAttribute('data-err', e instanceof Error ? e.message : '')
  return (
    <>
      <div data-testid="banner">{banner}</div>
      <button onClick={() => void crudOp('deuda', 'update', { ...deuda({ _id: 7, nombre: 'X' }), es_tarjeta: false, crear_tx: false } as never)}>upd</button>
      <button onClick={() => void apiAction('/api/deuda/3/pago', { monto: 5 }).catch(err)}>act</button>
      <button onClick={() => void crudOp('tx', 'delete', { _id: 9 })}>del</button>
      <button onClick={() => void crudOpOrBanner('rec', 'delete', { _id: 2 })}>delb</button>
      <button
        onClick={() =>
          void crudOp('tx', 'add', { fecha: '2026-08-01', tipo: 'gasto', categoria: 'c', descripcion: '', monto: 1, notas: '', tarjeta_id: null }).catch(err)
        }
      >
        add
      </button>
    </>
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('mutaciones', () => {
  it('add: POST /api/tx con header, JSON y recarga', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/tx': {} })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('add'))
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
    const [post] = f.mutations()
    expect(post?.method).toBe('POST')
    expect(post?.url).toBe('/api/tx')
    expect(post?.headers).toEqual({ 'X-Moni-Request': '1', 'Content-Type': 'application/json' })
    expect(post?.body).toEqual({ fecha: '2026-08-01', tipo: 'gasto', categoria: 'c', descripcion: '', monto: 1, notas: '', tarjeta_id: null })
  })

  it('update: PUT /api/deuda/{_id} sin _id en el body', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'PUT /api/deuda/7': {} })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('upd'))
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
    const [put] = f.mutations()
    expect(put?.method).toBe('PUT')
    expect(put?.url).toBe('/api/deuda/7')
    expect(put?.body).not.toHaveProperty('_id')
    expect(put?.body).toHaveProperty('nombre', 'X')
  })

  it('delete: DELETE sin body ni Content-Type, y recarga', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'DELETE /api/tx/9': null })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('del'))
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
    const [del] = f.mutations()
    expect(del?.headers).toEqual({ 'X-Moni-Request': '1' })
    expect(del?.body).toBeUndefined()
  })

  it('apiAction: POST al path dado con el payload', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda/3/pago': {} })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('act'))
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
    expect(f.mutations()[0]?.body).toEqual({ monto: 5 })
  })

  it('crudOp propaga el error y no recarga', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda/3/pago': failure(422, [{ msg: 'a' }, { msg: 'b' }]) })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('act'))
    await waitFor(() => expect(document.body.getAttribute('data-err')).toBe('a, b'))
    expect(f.callsTo('GET', '/api/all')).toHaveLength(0)
  })

  it('crudOpOrBanner: el error de la mutación queda en el banner aunque el refetch también falle', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'DELETE /api/rec/2': failure(500, 'boom'), 'GET /api/all': failure(503, 'caído') })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('delb'))
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('⚠ boom'))
  })

  it('crudOpOrBanner: un refetch exitoso no borra el error de la mutación', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'DELETE /api/rec/2': failure(500, 'boom') })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('delb'))
    await waitFor(() => expect(f.callsTo('GET', '/api/all')).toHaveLength(1))
    expect(f.mutations()).toHaveLength(1)
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('⚠ boom'))
  })
})
