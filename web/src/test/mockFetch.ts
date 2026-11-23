import { vi } from 'vitest'
import type {
  Estado,
  EsteMes,
  Evolucion,
  GastosPeriodo,
  ListadoTx,
  Movimientos,
  OpcionesTx,
  OpsOcultas,
  ProximasOperaciones,
  ResumenDashboard,
} from '../types'
import { estado } from './factories'
import { filaRegistrada } from './filas'
import { META } from './meta'

export interface RecordedCall {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
}

export type Handler = unknown

export const ESTADO_INICIAL: Estado = estado()

const FRASE_SIN_INGRESOS = {
  tipo: 'sin_ingresos' as const,
  texto: 'Todavía no entró plata este mes.',
  partes: [{ texto: 'Todavía no entró plata este mes.', tono: null }],
}

const RESUMEN_DASHBOARD: ResumenDashboard = { patrimonio: 0, proy_delta: 0, texto_proyeccion: 'proyectados en 12 meses', partes: [], total_barra: 0 }

const EVOLUCION: Evolucion = {
  serie: 'patrimonio',
  periodo: '6M',
  meses: 6,
  puntos: [],
  desde: 0,
  hasta: 0,
  cambio: 0,
  verbo: 'Te mantuviste',
  sujeto: '',
  mes_desde: '',
  nombre_serie: 'Patrimonio',
  frase: { texto: '', partes: [] },
}

const ESTE_MES: EsteMes = { ingresos: 0, gastos: 0, quedo: 0, ahorro_pct: 0, frase: FRASE_SIN_INGRESOS, descripcion_grafico: 'Entró y salió por mes, últimos 6 meses', meses: [] }

const GASTOS: GastosPeriodo = {
  periodo: '1M',
  nombre_periodo: 'el último mes',
  total: 0,
  max: 0,
  top: null,
  frase: null,
  categorias: [],
}

const MOVIMIENTOS: Movimientos = { items: [] }

const PROXIMAS: ProximasOperaciones = { hoy: ESTADO_INICIAL.hoy, items: [], extra: [], texto_ver_todas: null, vencidas: 0, visibles: 5, frase: null, texto_vacio: 'Sin operaciones en los próximos 45 días.' }

const LISTADO_TX: ListadoTx = {
  items: [],
  filtros: { tipo: '', mes: '', cat: '' },
  opciones: { meses: [], categorias: [], tipos: [] },
  pills: [],
  resumen: { ingresos: 0, gastos: 0, neto: 0, dato: { texto: '', partes: [] }, segmentos: [] },
}

const OPCIONES_TX: OpcionesTx = {
  tarjetas: [],
  categorias: { ingreso: ['Crédito recibido'], gasto: ['Inversión', 'Compra activos'] },
  categoria_default: { ingreso: 'Crédito recibido', gasto: 'Inversión' },
  inicial: { tipo: 'gasto', categoria: 'Inversión', tarjeta_id: null, fecha: '2026-08-20T10:30' },
}

const OPS_OCULTAS: OpsOcultas = { items: [] }

const VISTAS_VACIAS: Record<string, Handler> = {
  'GET /api/dashboard/resumen': RESUMEN_DASHBOARD,
  'GET /api/dashboard/evolucion': EVOLUCION,
  'GET /api/dashboard/este-mes': ESTE_MES,
  'GET /api/dashboard/gastos': GASTOS,
  'GET /api/meta': META,
  'GET /api/dashboard/movimientos': MOVIMIENTOS,
  'GET /api/proximas-operaciones': PROXIMAS,
  'GET /api/tx': LISTADO_TX,
  'GET /api/tx/opciones': OPCIONES_TX,
  'GET /api/deudas/resumen': {
    total: 0,
    total_cuotas: 0,
    total_intereses: 0,
    dato: { cuotas: '$0', cuotas_sufijo: '/mes en cuotas', intereses: null, intereses_sufijo: 'pagados en intereses' },
    segmentos: [],
    creditos: [],
    tarjetas: [],
    terminadas: [],
  },
  'GET /api/inv/resumen': {
    total_invertido: 0,
    total_actual: 0,
    ganancia: 0,
    ganancia_pct: 0,
    mostrar_ganancia: false,
    texto_ganancia: '',
    texto_posiciones: '0 posiciones',
    segmentos: [],
    fijas: [],
    variables: [],
  },
  'GET /api/activos/resumen': { total_inicial: 0, total_actual: 0, variacion: 0, variacion_pct: 0, segmentos: [], items: [] },
  'GET /api/rec/resumen': {
    total_gastos_mensual: 0,
    total_ingresos_mensual: 0,
    neto_mensual: 0,
    dato: { texto: '', partes: [] },
    segmentos: [],
    ingresos: [],
    gastos: [],
  },
  'GET /api/ops-ocultas': OPS_OCULTAS,
  'GET /api/auth/estado': { configurado: true, autenticado: true, passkeys: 0 },
  'GET /api/auth/sesiones': [],
  'GET /api/auth/passkeys': [],
}

export const json = (body: unknown, status = 200): Response =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export const failure = (status: number, detail: unknown): Response => json({ detail }, status)

export function mockFetch(routes: Record<string, Handler> = {}) {
  const calls: RecordedCall[] = []
  const table: Record<string, Handler> = { 'GET /api/bootstrap': ESTADO_INICIAL, ...VISTAS_VACIAS, ...routes }

  const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    const call: RecordedCall = {
      method,
      url,
      headers: { ...(init?.headers as Record<string, string> | undefined) },
      body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
    }
    calls.push(call)
    const exacta = `${method} ${url}`
    const h = exacta in table ? table[exacta] : (table[`${method} ${url.split('?')[0] ?? url}`] ?? (method === 'GET' ? filaRegistrada(url) : undefined))
    if (h === undefined) return Promise.resolve(failure(404, `sin mock: ${method} ${url}`))
    const out = typeof h === 'function' ? (h as (c: RecordedCall) => unknown)(call) : h
    return Promise.resolve(out instanceof Response ? out : json(out))
  })
  vi.stubGlobal('fetch', fn)

  return {
    fn,
    calls,
    mutations: () => calls.filter((c) => c.method !== 'GET'),
    callsTo: (method: string, url: string) => calls.filter((c) => c.method === method && c.url === url),
    set: (key: string, h: Handler) => {
      table[key] = h
    },
  }
}
