import { waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { estado, inversion } from '../../../test/factories'
import { mockFetch } from '../../../test/mockFetch'
import { renderWithProviders } from '../../../test/render'
import type { Inversion, ResumenInversiones } from '../../../types'
import { Inversiones } from '../index'

export const CDT = inversion({
  id: 5,
  nombre: 'CDT Uno',
  tipo: 'fija',
  monto_invertido: 1_000_000,
  valor_actual: 1_010_000,
  tasa_ea: 12,
  fecha_inicio: '2026-01-10',
  pago: 'vencimiento',
  dia_pago: null,
  valor_actualizado_en: '2026-11-01',
  ganancia: 10_000,
  ganancia_pct: 1,
  tasa_mv: 0.9489,
  texto_tasa: '12,00% EA · 0,9489% MV',
  rendimiento_esperado: 9584,
  capitaliza_default: true,
})
export const FONDO = inversion({
  id: 6,
  nombre: 'Fondo X',
  tipo: 'variable',
  monto_invertido: 500_000,
  valor_actual: 450_000,
  fecha_inicio: '2026-02-01',
  valor_actualizado_en: '2026-08-01',
  ganancia: -50_000,
  ganancia_pct: -10,
  desactualizado: true,
})

export function installFakeClock() {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 12, 10, 30) })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
}

const RESUMEN: ResumenInversiones = {
  total_invertido: 1_500_000,
  total_actual: 1_460_000,
  ganancia: -40_000,
  ganancia_pct: -2.67,
  mostrar_ganancia: true,
  texto_ganancia: '$40k (2,7%) perdido',
  texto_posiciones: '2 posiciones',
  segmentos: [
    { key: '5', label: 'CDT Uno', valor: 1_010_000 },
    { key: '6', label: 'Fondo X', valor: 450_000 },
  ],
  fijas: [CDT],
  variables: [FONDO],
}

const resumenDe = (invs: Inversion[]): ResumenInversiones =>
  invs === DEFAULT
    ? RESUMEN
    : { ...RESUMEN, texto_posiciones: `${invs.length} ${invs.length === 1 ? 'posición' : 'posiciones'}`, total_invertido: 0, total_actual: 0, ganancia: 0, ganancia_pct: 0, segmentos: [], fijas: invs.filter((i) => i.tipo === 'fija'), variables: invs.filter((i) => i.tipo === 'variable') }

export const DEFAULT = [CDT, FONDO]
let actual: Inversion[] = DEFAULT

export const mockInv = (routes: Record<string, unknown> = {}) =>
  mockFetch({
    'GET /api/inv/resumen': () => resumenDe(actual),
    ...routes,
  })

export async function setup(invs = DEFAULT) {
  actual = invs
  if (!vi.isMockFunction(globalThis.fetch)) mockInv()
  const r = renderWithProviders(<Inversiones active />, { estado: estado({ inversiones: invs }) })
  await waitFor(() => expect(document.querySelectorAll('.inv-card, .empty')).not.toHaveLength(0))
  return r
}

export const modal = () => within(document.getElementById('modal-overlay') as HTMLElement)
export const reales = (f: ReturnType<typeof mockFetch>) => f.mutations().filter((c) => !c.url.endsWith('/preview'))
export const H = { 'X-Moni-Request': '1' }
export type User = ReturnType<typeof userEvent.setup>

export async function typeMoney(user: User, id: string, text: string) {
  const el = document.getElementById(id) as HTMLInputElement
  await user.clear(el)
  await user.type(el, text)
}

export const grid = (tipo: 'fija' | 'variable') => document.getElementById(`inv-grid-${tipo}`) as HTMLElement
export const clickInGrid = (user: User, tipo: 'fija' | 'variable', name: string) =>
  user.click(within(grid(tipo)).getByRole('button', { name }))
