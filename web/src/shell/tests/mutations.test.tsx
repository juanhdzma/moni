import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { conAfectadas, failure, mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { useData } from '@/shell/providers/DataProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import { deuda } from '../../test/factories'

function Harness() {
  const { crudOp, crudOpOrBanner, apiAction, apiActionOrBanner } = useMutations()
  const { banner, versiones } = useData()
  const err = (e: unknown) => document.body.setAttribute('data-err', e instanceof Error ? e.message : '')
  return (
    <>
      <div data-testid="banner">{banner}</div>
      <output data-testid="deudas">{versiones.deudas}</output>
      <output data-testid="transacciones">{versiones.transacciones}</output>
      <button onClick={() => void crudOp('deuda', 'update', { ...deuda({ id: 7, nombre: 'X' }), clase_deuda: 'prestamo', crear_tx: false } as never)}>upd</button>
      <button onClick={() => void apiAction('/api/deuda/3/pago', { monto: 5 }).catch(err)}>act</button>
      <button onClick={() => void apiActionOrBanner('/api/rec/2/pausar')}>actb</button>
      <button onClick={() => void crudOp('tx', 'delete', { id: 9 })}>del</button>
      <button onClick={() => void crudOpOrBanner('rec', 'delete', { id: 2 })}>delb</button>
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
  it('add: POST /api/tx con header, JSON y recarga solo de transacciones si no hay tarjeta', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/tx': {} })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('transacciones')).toHaveTextContent('1'))
    expect(screen.getByTestId('deudas')).toHaveTextContent('0')
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(0)
    const [post] = f.mutations()
    expect(post?.method).toBe('POST')
    expect(post?.url).toBe('/api/tx')
    expect(post?.headers).toEqual({ 'X-Moni-Request': '1', 'Content-Type': 'application/json' })
    expect(post?.body).toEqual({ fecha: '2026-08-01', tipo: 'gasto', categoria: 'c', descripcion: '', monto: 1, notas: '', tarjeta_id: null })
  })

  it('update: PUT /api/deuda/{id} sin id en el body', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'PUT /api/deuda/7': {} })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('upd'))
    await waitFor(() => expect(screen.getByTestId('deudas')).toHaveTextContent('1'))
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(0)
    const [put] = f.mutations()
    expect(put?.method).toBe('PUT')
    expect(put?.url).toBe('/api/deuda/7')
    expect(put?.body).not.toHaveProperty('id')
    expect(put?.body).toHaveProperty('nombre', 'X')
  })

  it('delete: DELETE sin body ni Content-Type, y recarga', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'DELETE /api/tx/9': null })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('del'))
    await waitFor(() => expect(screen.getByTestId('deudas')).toHaveTextContent('1'))
    expect(screen.getByTestId('transacciones')).toHaveTextContent('1')
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(0)
    const [del] = f.mutations()
    expect(del?.headers).toEqual({ 'X-Moni-Request': '1' })
    expect(del?.body).toBeUndefined()
  })

  it('apiAction: POST al path dado con el payload', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda/3/pago': {} })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('act'))
    await waitFor(() => expect(screen.getByTestId('deudas')).toHaveTextContent('1'))
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(0)
    expect(f.mutations()[0]?.body).toEqual({ monto: 5 })
  })

  it('usa las entidades del header X-Moni-Afectadas, no el payload', async () => {
    const user = userEvent.setup()
    mockFetch({ 'POST /api/tx': conAfectadas({}, 'transacciones,deudas') })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('add'))
    await waitFor(() => expect(screen.getByTestId('deudas')).toHaveTextContent('1'))
    expect(screen.getByTestId('transacciones')).toHaveTextContent('1')
  })

  it('sin header invalida todo, incluido el bootstrap', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda/3/pago': new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }) })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('act'))
    await waitFor(() => expect(screen.getByTestId('transacciones')).toHaveTextContent('1'))
    expect(screen.getByTestId('deudas')).toHaveTextContent('1')
    await waitFor(() => expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
  })

  it('crudOp propaga el error y no recarga', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda/3/pago': failure(422, [{ msg: 'a' }, { msg: 'b' }]) })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('act'))
    await waitFor(() => expect(document.body.getAttribute('data-err')).toBe('a, b'))
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(0)
  })

  it('crudOpOrBanner: el error de la mutación queda en el banner aunque el refetch también falle', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'DELETE /api/rec/2': failure(500, 'boom'), 'GET /api/bootstrap': failure(503, 'caído') })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('delb'))
    await waitFor(() => expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('boom'))
  })

  it('crudOpOrBanner: un refetch exitoso no borra el error de la mutación', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'DELETE /api/rec/2': failure(500, 'boom') })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('delb'))
    await waitFor(() => expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    expect(f.mutations()).toHaveLength(1)
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('boom'))
  })

  it('apiActionOrBanner: el POST de acción fallido recarga y deja el error en el banner', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/rec/2/pausar': failure(500, 'boom') })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('actb'))
    await waitFor(() => expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'POST', url: '/api/rec/2/pausar', headers: { 'X-Moni-Request': '1' } })
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('boom'))
  })
})
