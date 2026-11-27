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
  ResumenActivos,
  ResumenDashboard,
  ResumenDeudas,
  ResumenInversiones,
  ResumenRecurrentes,
} from '@/types'
import { afectadasPorDefecto, HEADER_AFECTADAS } from './afectadas'
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

const RESUMEN_DASHBOARD: ResumenDashboard = { patrimonio: 0, patrimonio_tono: 'neutro', patrimonio_signo: '', proy_delta: 0, proy_delta_tono: 'neutro', proy_delta_signo: '', texto_proyeccion: 'proyectados en 12 meses', partes: [], total_barra: 0 }

const EVOLUCION: Evolucion = {
  serie: 'patrimonio',
  periodo: '6M',
  meses: 6,
  puntos: [],
  desde: 0,
  cambio: 0,
  nombre_serie: 'Patrimonio',
  tono: 'cartera',
  descripcion_grafico: 'Evolución mensual de patrimonio',
  frase: { texto: '', partes: [] },
}

const ESTE_MES: EsteMes = { ingresos: 0, gastos: 0, gastos_firmado: 0, quedo: 0, tono_ingresos: 'neutro', tono_gastos: 'deudas', tono_quedo: 'neutro', signo_ingresos: '', signo_gastos: '', signo_quedo: '', titulo: 'Este mes en tu cartera', etiqueta_ingresos: 'Entró', etiqueta_gastos: 'Salió', titulo_quedo: 'Te quedó', texto_tarjeta: 'Lo pagado con tarjeta no sale de la cartera.', frase: FRASE_SIN_INGRESOS, descripcion_grafico: 'Entró y salió por mes, últimos 6 meses', meses: [] }

const GASTOS: GastosPeriodo = {
  periodo: '1M',
  total: 0,
  max: 0,
  top: null,
  frase: null,
  categorias: [],
  texto_vacio: 'Sin gastos para este período',
  texto_total: 'Total gastado, con tarjetas',
}

const MOVIMIENTOS: Movimientos = { items: [], texto_vacio: { titulo: 'Sin transacciones', texto: 'Registrá un ingreso o gasto y aparece acá.' } }

const PROXIMAS: ProximasOperaciones = { items: [], extra: [], texto_ver_todas: null, texto_ver_menos: null, frase: null, texto_vacio: 'Sin operaciones en los próximos 45 días.' }

const LISTADO_TX: ListadoTx = {
  items: [],
  filtros: { tipo: '', mes: '', cat: '' },
  opciones: { meses: [], categorias: [], tipos: [] },
  pills: [],
  texto_vacio: { titulo: 'Sin movimientos', texto: 'Agregá un ingreso o gasto con el botón de arriba.' },
  resumen: { titulo: 'Te quedó', ingresos: 0, gastos: 0, gastos_firmado: 0, neto: 0, neto_tono: 'neutro', neto_signo: '', dato: { texto: '', partes: [] }, segmentos: [] },
}

const OPCIONES_TX: OpcionesTx = {
  tarjetas: [],
  categorias: { ingreso: ['Crédito recibido'], gasto: ['Inversión', 'Compra activos'] },
  categoria_default: { ingreso: 'Crédito recibido', gasto: 'Inversión' },
  inicial: { tipo: 'gasto', categoria: 'Inversión', tarjeta_id: null, fecha: '2026-08-20T10:30' },
}

const OPS_OCULTAS: OpsOcultas = { items: [], texto_vacio: 'Ninguna operación oculta.' }

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
    dato: { cuotas: '$0', cuotas_sufijo: '/mes en cuotas', intereses: null, intereses_sufijo: 'pagados en intereses' },
    segmentos: [],
    creditos: [],
    tarjetas: [],
    terminadas: [],
    texto_vacio_creditos: { titulo: 'Sin créditos', texto: 'Agregá uno con el botón + de arriba.' },
    texto_vacio_tarjetas: { titulo: 'Sin tarjetas', texto: 'Agregá una con el botón + de arriba.' },
  } satisfies ResumenDeudas,
  'GET /api/inv/resumen': {
    total_actual: 0,
    ganancia: 0,
    ganancia_tono: 'neutro',
    ganancia_signo: '',
    ganancia_pct: 0,
    mostrar_ganancia: false,
    texto_ganancia: '',
    texto_posiciones: '0 posiciones',
    segmentos: [],
    fijas: [],
    variables: [],
    texto_vacio_fijas: { titulo: 'Sin inversiones fijas', texto: 'Agregá una con el botón + de arriba.' },
    texto_vacio_variables: { titulo: 'Sin inversiones variables', texto: 'Agregá una con el botón + de arriba.' },
  } satisfies ResumenInversiones,
  'GET /api/activos/resumen': {
    total_actual: 0,
    variacion: 0,
    variacion_tono: 'neutro',
    variacion_signo: '',
    mostrar_variacion: false,
    segmentos: [],
    items: [],
    texto_variacion: '',
    texto_conteo: '0 activos',
    texto_vacio: { titulo: 'Sin activos', texto: 'Registrá propiedades, vehículos u otros bienes con el botón Nuevo activo.' },
  } satisfies ResumenActivos,
  'GET /api/rec/resumen': {
    neto_mensual: 0,
    neto_mensual_tono: 'neutro',
    neto_mensual_signo: '',
    dato: { texto: '', partes: [] },
    segmentos: [],
    ingresos: [],
    gastos: [],
    texto_vacio_ingresos: { titulo: 'Sin ingresos recurrentes', texto: 'Agregá uno con el botón Nuevo.' },
    texto_vacio_gastos: { titulo: 'Sin gastos recurrentes', texto: 'Agregá uno con el botón Nuevo.' },
  } satisfies ResumenRecurrentes,
  'GET /api/ops-ocultas': OPS_OCULTAS,
  'GET /api/auth/estado': { configurado: true, autenticado: true, tiene_passkeys: false },
  'GET /api/auth/sesiones': [],
  'GET /api/auth/passkeys': [],
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

export const conAfectadas = (body: unknown, entidades: string): Response => json(body, 200, { [HEADER_AFECTADAS]: entidades })

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
    if (out instanceof Response) return Promise.resolve(out)
    const afectadas = afectadasPorDefecto(method, url, call.body)
    return Promise.resolve(json(out, 200, afectadas ? { [HEADER_AFECTADAS]: afectadas.join(',') } : {}))
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

export const previewConMonto = (campo: string, respuesta: unknown) => (call: RecordedCall) =>
  Number((call.body as Record<string, unknown>)[campo]) > 0 ? respuesta : null

export const previewSi = (condicion: (body: Record<string, unknown>) => boolean, respuesta: unknown) => (call: RecordedCall) =>
  condicion(call.body as Record<string, unknown>) ? respuesta : null
