import { fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { H, clickInGrid, installFakeClock, mockInv, modal, reales, setup, typeMoney, type User } from './fixtures'

installFakeClock()

const casos: { nombre: string; tipo: 'fija' | 'variable'; boton: string; id: number; ruta: string; guardar: string; llenar?: (user: User) => Promise<void> }[] = [
  { nombre: 'aporte', tipo: 'variable', boton: '+ Más', id: 6, ruta: 'aporte', guardar: 'Agregar aporte', llenar: (user) => typeMoney(user, 'm-monto', '50000') },
  { nombre: 'rendimiento', tipo: 'fija', boton: 'Rendimiento', id: 5, ruta: 'rendimiento', guardar: 'Registrar' },
  { nombre: 'retiro', tipo: 'fija', boton: 'Retirar', id: 5, ruta: 'retiro', guardar: 'Confirmar retiro' },
]

describe.each(casos)('fecha de $nombre', ({ tipo, boton, id, ruta, guardar, llenar }) => {
  const enviar = async (tocarFecha: boolean) => {
    const user = userEvent.setup()
    const f = mockInv({ [`POST /api/inv/${id}/${ruta}`]: {}, [`POST /api/inv/${id}/${ruta}/preview`]: { nuevo_valor_estimado: 0, texto_estimado: '' } })
    await setup()
    await clickInGrid(user, tipo, boton)
    await llenar?.(user)
    if (tocarFecha) fireEvent.change(document.querySelector('#modal-body .cdp-native') as HTMLElement, { target: { value: '2026-08-03' } })
    await user.click(modal().getByRole('button', { name: guardar }))
    await waitFor(() => expect(reales(f)).toHaveLength(1))
    return reales(f)[0]
  }

  it('no se manda si no se tocó: la pone el backend', async () => {
    const llamada = await enviar(false)
    expect(llamada).toMatchObject({ url: `/api/inv/${id}/${ruta}`, headers: H })
    expect(llamada?.body).not.toHaveProperty('fecha')
  })

  it('se manda cuando la persona la elige', async () => {
    const llamada = await enviar(true)
    expect(llamada?.body).toMatchObject({ fecha: '2026-08-03' })
  })
})
