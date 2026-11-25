import { waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActivoForm } from '@/features/activos/forms/ActivoForm'
import { ActivoValorForm } from '@/features/activos/forms/ActivoValorForm'
import { ActivoVentaForm } from '@/features/activos/forms/ActivoVentaForm'
import { AdelantoForm } from '@/features/deudas/forms/AdelantoForm'
import { DeudaForm } from '@/features/deudas/forms/DeudaForm'
import { PagoForm } from '@/features/deudas/forms/PagoForm'
import { AporteForm } from '@/features/inversiones/forms/AporteForm'
import { InversionForm } from '@/features/inversiones/forms/InversionForm'
import { RendimientoForm } from '@/features/inversiones/forms/RendimientoForm'
import { RetiroForm } from '@/features/inversiones/forms/RetiroForm'
import { ValorForm } from '@/features/inversiones/forms/ValorForm'
import { MaterializeForm } from '@/features/recurrentes/forms/MaterializeForm'
import { RecurrenteForm } from '@/features/recurrentes/forms/RecurrenteForm'
import { TxForm } from '@/features/transacciones/forms/TxForm'
import { activo, deuda, inversion, recurrente } from '@/test/factories'
import { mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'

afterEach(() => vi.unstubAllGlobals())

interface Caso {
  nombre: string
  form: ReactElement
  campo: string
  texto: string
  ruta: string
  body: Record<string, unknown>
}

const casos: Caso[] = [
  { nombre: 'tx', form: <TxForm tx={null} />, campo: '#m-desc', texto: 'Café', ruta: '/api/tx', body: { descripcion: 'Café' } },
  { nombre: 'deuda', form: <DeudaForm d={null} />, campo: '#m-nombre', texto: 'Carro', ruta: '/api/deuda', body: { nombre: 'Carro' } },
  { nombre: 'inversion', form: <InversionForm inv={null} />, campo: '#m-nombre', texto: 'CDT', ruta: '/api/inv', body: { nombre: 'CDT' } },
  { nombre: 'activo', form: <ActivoForm activo={null} />, campo: '#m-nombre', texto: 'Casa', ruta: '/api/activo', body: { nombre: 'Casa' } },
  { nombre: 'recurrente', form: <RecurrenteForm item={null} />, campo: '#m-nombre', texto: 'Netflix', ruta: '/api/rec', body: { nombre: 'Netflix' } },
  { nombre: 'materializar recurrente', form: <MaterializeForm r={recurrente({ id: 4 })} dateISO="2026-08-01" />, campo: '#m-desc', texto: ' Extra', ruta: '/api/tx', body: { descripcion: 'Rec Extra' } },
  { nombre: 'pago', form: <PagoForm d={deuda({ id: 1 })} modo="cuota" />, campo: '#m-notas', texto: 'nota', ruta: '/api/deuda/1/pago', body: { notas: 'nota', modo: 'cuota' } },
  { nombre: 'adelanto', form: <AdelantoForm d={deuda({ id: 1 })} />, campo: '#m-notas', texto: 'nota', ruta: '/api/deuda/1/adelanto', body: { notas: 'nota' } },
  { nombre: 'aporte', form: <AporteForm inv={inversion({ id: 1 })} />, campo: '#m-notas', texto: 'nota', ruta: '/api/inv/1/aporte', body: { notas: 'nota' } },
  { nombre: 'rendimiento', form: <RendimientoForm inv={inversion({ id: 1 })} />, campo: '#m-notas', texto: 'nota', ruta: '/api/inv/1/rendimiento', body: { notas: 'nota' } },
  { nombre: 'retiro', form: <RetiroForm inv={inversion({ id: 1 })} />, campo: '#m-notas-retiro', texto: 'nota', ruta: '/api/inv/1/retiro', body: { notas: 'nota' } },
  { nombre: 'valor de inversión', form: <ValorForm inv={inversion({ id: 1 })} />, campo: '#m-nuevo-valor', texto: '600000', ruta: '/api/inv/1/valor', body: { nuevo_valor: 600000 } },
  { nombre: 'valor de activo', form: <ActivoValorForm activo={activo({ id: 1 })} />, campo: '#m-nuevo-valor', texto: '700000', ruta: '/api/activo/1/valor', body: { nuevo_valor: 700000 } },
  { nombre: 'venta de activo', form: <ActivoVentaForm activo={activo({ id: 1 })} />, campo: '#m-notas', texto: 'nota', ruta: '/api/activo/1/venta', body: { notas: 'nota' } },
]

describe('Enter guarda en los forms de entidad', () => {
  it.each(casos)('$nombre: Enter en un campo manda el request exacto una sola vez', async ({ form, campo, texto, ruta, body }) => {
    const f = mockFetch({ [`POST ${ruta}`]: {} })
    const user = userEvent.setup()
    renderWithProviders(form)
    await waitFor(() => expect(document.querySelector(campo)).toBeTruthy())
    await user.type(document.querySelector(campo) as HTMLElement, `${texto}{Enter}`)
    await waitFor(() => expect(f.callsTo('POST', ruta)).toHaveLength(1))
    expect(f.callsTo('POST', ruta)[0]).toMatchObject({ headers: { 'X-Moni-Request': '1' }, body })
  })
})
