import type {
  Activo,
  Ajustes,
  ApiActivo,
  ApiAll,
  ApiDeuda,
  ApiInversion,
  ApiRecurrente,
  Categorias,
  Deuda,
  Estado,
  Evolucion,
  EsteMes,
  FiltrosTx,
  GastosPeriodo,
  Inversion,
  ListadoTx,
  MigrarLocalIn,
  MigrarLocalResult,
  Movimientos,
  OpsOcultas,
  PeriodoEvolucion,
  PeriodoGastos,
  PreviewAdelanto,
  PreviewAporte,
  PreviewPago,
  PreviewValor,
  PreviewVenta,
  ProximasOperaciones,
  Recurrente,
  ResumenActivos,
  ResumenDashboard,
  ResumenDeudas,
  ResumenInversiones,
  ResumenRecurrentes,
  SerieEvolucion,
  Tasa,
  TipoTx,
  WithId,
} from '../types'

export interface ApiFetchOptions {
  method?: string
  body?: unknown
}

function mensajeDeError(j: unknown, status: number): string {
  const msg = `Error ${status}`
  if (typeof j !== 'object' || j === null || !('detail' in j)) return msg
  const detail = j.detail
  if (Array.isArray(detail)) {
    return (detail as unknown[])
      .map((d) => (typeof d === 'object' && d !== null && 'msg' in d ? String(d.msg) : ''))
      .join(', ')
  }
  return typeof detail === 'string' && detail ? detail : msg
}

export async function apiFetch<T = unknown>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET'
  const headers: Record<string, string> = {}
  if (method !== 'GET') headers['X-Moni-Request'] = '1'
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(path, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    let msg: string
    try {
      msg = mensajeDeError(await res.json(), res.status)
    } catch {
      msg = `Error ${res.status}`
    }
    throw new Error(msg)
  }
  if (res.status === 204) return null as T
  return (await res.json()) as T
}

const conId = <T extends { id: number }>(r: T): T & WithId => ({ ...r, _id: r.id })

export function mapAll(data: ApiAll): Estado {
  return {
    ...data,
    transacciones: data.transacciones.map(conId),
    deudas: data.deudas.map(conId),
    inversiones: data.inversiones.map(conId),
    activos: data.activos.map(conId),
    recurrentes: data.recurrentes.map(conId),
  }
}

export async function loadAll(): Promise<Estado> {
  return mapAll(await apiFetch<ApiAll>('/api/all'))
}

function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

const get = <T>(path: string) => apiFetch<T>(path)
const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body })

export const cargarResumenDashboard = () => get<ResumenDashboard>('/api/dashboard/resumen')
export const cargarEvolucion = (serie: SerieEvolucion, periodo: PeriodoEvolucion) =>
  get<Evolucion>(`/api/dashboard/evolucion${query({ serie, periodo })}`)
export const cargarEsteMes = () => get<EsteMes>('/api/dashboard/este-mes')
export const cargarGastos = (periodo: PeriodoGastos) => get<GastosPeriodo>(`/api/dashboard/gastos${query({ periodo })}`)
export const cargarMovimientos = (n?: number) => get<Movimientos>(`/api/dashboard/movimientos${query({ n })}`)
export const cargarProximasOperaciones = () => get<ProximasOperaciones>('/api/proximas-operaciones')
export const cargarListadoTx = (f: FiltrosTx = {}) => get<ListadoTx>(`/api/tx${query({ ...f })}`)

type CrudoResumen<T, K extends keyof T, R> = Omit<T, K> & { [P in K]: R[] }

export async function cargarResumenDeudas(): Promise<ResumenDeudas> {
  const r = await get<CrudoResumen<ResumenDeudas, 'creditos' | 'tarjetas' | 'terminadas', ApiDeuda>>('/api/deudas/resumen')
  const ids = (l: ApiDeuda[]): Deuda[] => l.map(conId)
  return { ...r, creditos: ids(r.creditos), tarjetas: ids(r.tarjetas), terminadas: ids(r.terminadas) }
}

export async function cargarResumenInversiones(): Promise<ResumenInversiones> {
  const r = await get<CrudoResumen<ResumenInversiones, 'fijas' | 'variables', ApiInversion>>('/api/inv/resumen')
  const ids = (l: ApiInversion[]): Inversion[] => l.map(conId)
  return { ...r, fijas: ids(r.fijas), variables: ids(r.variables) }
}

export async function cargarResumenActivos(): Promise<ResumenActivos> {
  const r = await get<CrudoResumen<ResumenActivos, 'items', ApiActivo>>('/api/activos/resumen')
  const items: Activo[] = r.items.map(conId)
  return { ...r, items }
}

export async function cargarResumenRecurrentes(): Promise<ResumenRecurrentes> {
  const r = await get<CrudoResumen<ResumenRecurrentes, 'ingresos' | 'gastos', ApiRecurrente>>('/api/rec/resumen')
  const ids = (l: ApiRecurrente[]): Recurrente[] => l.map(conId)
  return { ...r, ingresos: ids(r.ingresos), gastos: ids(r.gastos) }
}

export const cargarTasa = (valor: number, tipo: 'ea' | 'mv') => get<Tasa>(`/api/calc/tasa${query({ valor, tipo })}`)

export const previewPago = (id: number, body: { total_pagado: number; nuevo_saldo: number }) =>
  post<PreviewPago>(`/api/deuda/${id}/pago/preview`, body)
export const previewAdelanto = (id: number, body: { monto: number; nuevo_saldo: number }) =>
  post<PreviewAdelanto>(`/api/deuda/${id}/adelanto/preview`, body)
export const previewValorInversion = (id: number, nuevo_valor: number) =>
  post<PreviewValor>(`/api/inv/${id}/valor/preview`, { nuevo_valor })
export const previewAporte = (id: number, monto: number) => post<PreviewAporte>(`/api/inv/${id}/aporte/preview`, { monto })
export const previewValorActivo = (id: number, nuevo_valor: number) =>
  post<PreviewValor>(`/api/activo/${id}/valor/preview`, { nuevo_valor })
export const previewVenta = (id: number, precio: number) => post<PreviewVenta>(`/api/activo/${id}/venta/preview`, { precio })

export const cargarCategorias = () => get<Categorias>('/api/categorias')
export const agregarCategoria = (tipo: TipoTx, nombre: string) => post<Categorias>('/api/categorias', { tipo, nombre })
export const quitarCategoria = (tipo: TipoTx, nombre: string) =>
  apiFetch<Categorias>(`/api/categorias${query({ tipo, nombre })}`, { method: 'DELETE' })

export const cargarAjustes = () => get<Ajustes>('/api/ajustes')
export const guardarAjustes = (ajustes: Ajustes) => apiFetch<Ajustes>('/api/ajustes', { method: 'PUT', body: ajustes })

export const cargarOpsOcultas = () => get<OpsOcultas>('/api/ops-ocultas')
export const ocultarOp = (clave: string) => post<{ clave: string }>('/api/ops-ocultas', { clave })
export const restaurarOp = (clave?: string) =>
  apiFetch<null>(`/api/ops-ocultas${query({ clave })}`, { method: 'DELETE' })

export const migrarLocal = (body: MigrarLocalIn) => post<MigrarLocalResult>('/api/migrar-local', body)
