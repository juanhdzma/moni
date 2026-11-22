import type {
  Activo,
  ApiActivo,
  ApiAll,
  ApiDeuda,
  ApiInversion,
  ApiRecurrente,
  Deuda,
  Estado,
  Inversion,
  Recurrente,
  ResumenActivos,
  ResumenDeudas,
  ResumenInversiones,
  ResumenRecurrentes,
  WithId,
} from '../../types'
import { apiFetch, get } from './client'

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
