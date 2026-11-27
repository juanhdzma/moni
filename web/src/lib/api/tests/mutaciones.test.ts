import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  actualizarEntidad,
  aportarInversion,
  borrarEntidad,
  crearEntidad,
  ocultarOperacion,
  pagarDeuda,
  pausarRecurrente,
  registrarRendimiento,
  retirarInversion,
  venderActivo,
} from '@/lib/api'

function fetchOk() {
  const fn = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers(), json: () => Promise.resolve({}) })
  vi.stubGlobal('fetch', fn)
  return fn
}

const cuerpoEnviado = (fn: ReturnType<typeof fetchOk>): unknown => JSON.parse((fn.mock.calls[0]?.[1] as { body: string }).body)

afterEach(() => vi.unstubAllGlobals())

describe('op_clave solo en los endpoints que lo aceptan', () => {
  const pago = { modo: 'cuota', total_pagado: 5, notas: '', registrar_tx: true } as const
  const rendimiento = { monto: 3, capitaliza: false, notas: '', registrar_tx: true }
  const tx = { fecha: '2026-08-01', tipo: 'gasto', categoria: 'c', descripcion: '', monto: 1, notas: '', tarjeta_id: null } as const

  it('POST /api/tx, pago y rendimiento la llevan', async () => {
    for (const llamar of [
      () => crearEntidad('tx', tx, { opClave: 'k' }),
      () => pagarDeuda(1, pago, { opClave: 'k' }),
      () => registrarRendimiento(2, rendimiento, { opClave: 'k' }),
    ]) {
      const fn = fetchOk()
      await llamar()
      expect(cuerpoEnviado(fn)).toMatchObject({ op_clave: 'k' })
      vi.unstubAllGlobals()
    }
  })

  it('el resto de las acciones nunca la mandan aunque llegue una clave', async () => {
    const fn = fetchOk()
    await aportarInversion(1, { monto: 1, notas: '', registrar_tx: true }, { opClave: 'k' })
    await retirarInversion(1, { tipo: 'total', monto: 1, notas: '', registrar_tx: true }, { opClave: 'k' })
    await venderActivo(1, { precio: 1, notas: '', registrar_tx: true }, { opClave: 'k' })
    await crearEntidad('deuda', { nombre: 'D' } as never, { opClave: 'k' })
    await ocultarOperacion('deuda:1:2026-01-01', { opClave: 'k' })
    for (const [, init] of fn.mock.calls as [string, { body?: string }][]) expect(init.body ?? '').not.toContain('op_clave')
  })

  it('sin clave el cuerpo viaja intacto', async () => {
    const fn = fetchOk()
    await pagarDeuda(1, pago)
    expect(cuerpoEnviado(fn)).toEqual(pago)
  })
})

describe('URLs por acción', () => {
  it.each([
    ['actualizar', () => actualizarEntidad('deuda', 7, {} as never), 'PUT', '/api/deuda/7'],
    ['borrar', () => borrarEntidad('tx', 9), 'DELETE', '/api/tx/9'],
    ['pausar', () => pausarRecurrente(2), 'POST', '/api/rec/2/pausar'],
    ['ocultar', () => ocultarOperacion('x'), 'POST', '/api/ops-ocultas'],
    ['vender', () => venderActivo(4, { precio: 1, notas: '', registrar_tx: true }), 'POST', '/api/activo/4/venta'],
  ])('%s', async (_n, llamar, metodo, url) => {
    const fn = fetchOk()
    await llamar()
    expect(fn).toHaveBeenCalledWith(url, expect.objectContaining({ method: metodo }))
  })
})
