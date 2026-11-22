import { within } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { deuda, estado } from '../../../test/factories'
import { mockFetch } from '../../../test/mockFetch'

export const credito = deuda({
  id: 1,
  nombre: 'Crédito carro',
  monto_inicial: 10000000,
  saldo_actual: 6000000,
  tasa_ea: 20,
  cuota_mensual: 500000,
  proxima_cuota: '2026-09-05',
  total_intereses: 800000,
  activa: true,
  vigente: true,
  progreso_pct: 40,
  capital_pagado: 4000000,
  meses_restantes: 12,
  nivel_progreso: 'medio',
  intereses_pagados: { valor: 800000, exacto: true },
  frases: {
    detalle: '20,0% EA · $500.000/mes',
    meses_restantes_texto: '~12m',
    progreso_texto: '40,0% pagado',
    intereses_texto: '$800.000',
    intereses_ayuda: 'Suma de los pagos registrados en Moni',
    intereses_saldada_texto: '$800.000 en intereses',
  },
})
export const tarjeta = deuda({
  id: 2,
  nombre: 'Visa Oro',
  es_tarjeta: 1,
  cupo: 5000000,
  saldo_actual: 1000000,
  franquicia: 'Visa',
  total_intereses: 12000,
  activa: true,
  vigente: true,
  disponible: 4000000,
  uso_pct: 20,
  nivel_uso: 'bajo',
  intereses_pagados: { valor: 12000, exacto: true },
  frases: {
    detalle: 'Cupo $5.000.000',
    meses_restantes_texto: null,
    progreso_texto: '0,0% pagado',
    intereses_texto: '$12.000',
    intereses_ayuda: 'Suma de los pagos registrados en Moni',
    intereses_saldada_texto: null,
  },
})
export const saldado = deuda({
  id: 3,
  nombre: 'Moto',
  monto_inicial: 3000000,
  saldo_actual: 0,
  tasa_ea: 18,
  cuota_mensual: 200000,
  total_intereses: 150000,
  progreso_pct: 100,
  capital_pagado: 3000000,
  nivel_progreso: 'alto',
  intereses_pagados: { valor: 150000, exacto: true },
  frases: {
    detalle: '18,0% EA',
    meses_restantes_texto: null,
    progreso_texto: '100,0% pagado',
    intereses_texto: '$150.000',
    intereses_ayuda: 'Suma de los pagos registrados en Moni',
    intereses_saldada_texto: '$150.000 en intereses',
  },
})

export const full = () => estado({ deudas: [credito, tarjeta, saldado] })

export const resumenCompleto = {
  total: 7000000,
  total_cuotas: 500000,
  total_intereses: 962000,
  intereses_aproximado: false,
  dato: { cuotas: '$500.000', cuotas_sufijo: '/mes en cuotas', intereses: '$962.000', intereses_sufijo: 'pagados en intereses' },
  segmentos: [
    { key: '1', label: 'Crédito carro', valor: 6000000 },
    { key: '2', label: 'Visa Oro', valor: 1000000 },
  ],
  creditos: [credito],
  tarjetas: [tarjeta],
  terminadas: [saldado],
}

export const conResumen = (r: unknown = resumenCompleto, extra: Record<string, unknown> = {}) =>
  mockFetch({ 'GET /api/deudas/resumen': r, ...extra })

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 8, 5, 10, 30) }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

export const installFakeDate = () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 8, 5, 10, 30) }))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
}

export const dialog = () => document.getElementById('modal-overlay') as HTMLElement
export const hdr = { 'X-Moni-Request': '1', 'Content-Type': 'application/json' }
export const acc = (f: ReturnType<typeof mockFetch>) => f.mutations().filter((c) => !c.url.endsWith('/preview'))
export const filaDe = (grid: string, name: string) => within(document.getElementById(grid) as HTMLElement).findByText(name)
