import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ESTADO_INICIAL, failure, mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { useModal } from '@/shell/providers/ModalProvider'
import { pagarDeuda } from '@/lib/api'
import type { DeudaPago } from '@/types'
import { useMutations } from '@/shell/hooks/acciones/useMutations'

const PAGO: DeudaPago = { modo: 'cuota', total_pagado: 9, notas: '', registrar_tx: true }

afterEach(() => vi.unstubAllGlobals())

describe('op_clave: alcance y orden', () => {
  function Orden({ clave, leerPendiente }: { clave: string | null; leerPendiente: { fn: () => string | null } }) {
    const { crudOp, accion } = useMutations()
    const { setPendingProxOp, pendingOpClave, openModal } = useModal()
    leerPendiente.fn = pendingOpClave
    return (
      <>
        <button onClick={() => { openModal('Form', <div />); setPendingProxOp(clave) }}>abrir</button>
        <button onClick={() => void crudOp('tx', 'update', { id: 4, fecha: '2026-08-01', tipo: 'gasto', categoria: 'c', descripcion: '', monto: 1, notas: '', tarjeta_id: null }).catch(() => undefined)}>put</button>
        <button onClick={() => void crudOp('tx', 'delete', { id: 4 }).catch(() => undefined)}>del</button>
        <button onClick={() => void accion((o) => pagarDeuda(1, PAGO, o)).catch(() => undefined)}>pago</button>
      </>
    )
  }

  const montar = (clave: string | null) => {
    const leer = { fn: (): string | null => 'sin-montar' }
    renderWithProviders(<Orden clave={clave} leerPendiente={leer} />)
    return leer
  }

  it('update y delete nunca llevan op_clave aunque haya una pendiente', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'PUT /api/tx/4': {}, 'DELETE /api/tx/4': null })
    montar('deuda:1:2026-08-20')
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByText('put'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByText('del'))
    await waitFor(() => expect(f.mutations()).toHaveLength(2))
    expect(f.mutations()[0]?.body).not.toHaveProperty('op_clave')
    expect(f.mutations()[1]?.body).toBeUndefined()
  })

  it('una clave vacía no agrega op_clave', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/deuda/1/pago': {} })
    montar('')
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByText('pago'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]?.body).toEqual(PAGO)
  })

  it('en éxito el body lleva la clave, closeModal la limpia y recién después se recarga', async () => {
    const user = userEvent.setup()
    let pendienteAlRecargar: string | null | undefined
    const leer = { fn: (): string | null => 'sin-montar' }
    const f = mockFetch({
      'POST /api/deuda/1/pago': new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
      'GET /api/bootstrap': () => {
        pendienteAlRecargar = leer.fn()
        return ESTADO_INICIAL
      },
    })
    renderWithProviders(<Orden clave="deuda:1:2026-08-20" leerPendiente={leer} />)
    await user.click(screen.getByText('abrir'))
    expect(leer.fn()).toBe('deuda:1:2026-08-20')
    await user.click(screen.getByText('pago'))
    await waitFor(() => expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    expect(f.mutations()[0]?.body).toEqual({ ...PAGO, op_clave: 'deuda:1:2026-08-20' })
    expect(pendienteAlRecargar).toBeNull()
    await waitFor(() => expect(document.getElementById('modal-overlay')).not.toHaveClass('open'))
  })

  it('si la mutación falla la clave sigue pendiente, el modal abierto y no se recarga', async () => {
    const user = userEvent.setup()
    const leer = { fn: (): string | null => 'sin-montar' }
    const f = mockFetch({ 'POST /api/deuda/1/pago': failure(422, 'mal') })
    renderWithProviders(<Orden clave="deuda:1:2026-08-20" leerPendiente={leer} />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByText('pago'))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(leer.fn()).toBe('deuda:1:2026-08-20')
    expect(document.getElementById('modal-overlay')).toHaveClass('open')
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(0)
  })
})
