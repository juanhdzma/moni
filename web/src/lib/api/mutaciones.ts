import type {
  ActivoValor,
  ActivoVenta,
  CrudEntity,
  CrudPayloads,
  DeudaAdelanto,
  DeudaPago,
  InvAporte,
  InvRendimiento,
  InvRetiro,
  InvValor,
} from '@/types'
import { apiFetch, type AlAfectar } from './client'

export interface OpcionesMutacion {
  onAfectadas?: AlAfectar
  opClave?: string | null
}

const conOpClave = <B extends object>(body: B, opClave?: string | null): B | (B & { op_clave: string }) =>
  opClave ? { ...body, op_clave: opClave } : body

const post = <T>(path: string, body: unknown, { onAfectadas }: OpcionesMutacion) =>
  apiFetch<T>(path, { method: 'POST', body, onAfectadas })

export const crearEntidad = <E extends CrudEntity>(entidad: E, body: CrudPayloads[E], o: OpcionesMutacion = {}) =>
  post(`/api/${entidad}`, entidad === 'tx' ? conOpClave(body, o.opClave) : body, o)

export const actualizarEntidad = <E extends CrudEntity>(entidad: E, id: number, body: CrudPayloads[E], { onAfectadas }: OpcionesMutacion = {}) =>
  apiFetch(`/api/${entidad}/${id}`, { method: 'PUT', body, onAfectadas })

export const borrarEntidad = (entidad: CrudEntity, id: number, { onAfectadas }: OpcionesMutacion = {}) =>
  apiFetch(`/api/${entidad}/${id}`, { method: 'DELETE', onAfectadas })

export const pagarDeuda = (id: number, body: DeudaPago, o: OpcionesMutacion = {}) =>
  post(`/api/deuda/${id}/pago`, conOpClave(body, o.opClave), o)
export const adelantarDeuda = (id: number, body: DeudaAdelanto, o: OpcionesMutacion = {}) => post(`/api/deuda/${id}/adelanto`, body, o)

export const registrarRendimiento = (id: number, body: InvRendimiento, o: OpcionesMutacion = {}) =>
  post(`/api/inv/${id}/rendimiento`, conOpClave(body, o.opClave), o)
export const aportarInversion = (id: number, body: InvAporte, o: OpcionesMutacion = {}) => post(`/api/inv/${id}/aporte`, body, o)
export const retirarInversion = (id: number, body: InvRetiro, o: OpcionesMutacion = {}) => post(`/api/inv/${id}/retiro`, body, o)
export const valorarInversion = (id: number, body: InvValor, o: OpcionesMutacion = {}) => post(`/api/inv/${id}/valor`, body, o)

export const valorarActivo = (id: number, body: ActivoValor, o: OpcionesMutacion = {}) => post(`/api/activo/${id}/valor`, body, o)
export const venderActivo = (id: number, body: ActivoVenta, o: OpcionesMutacion = {}) => post(`/api/activo/${id}/venta`, body, o)

export const pausarRecurrente = (id: number, o: OpcionesMutacion = {}) => post(`/api/rec/${id}/pausar`, undefined, o)
export const ocultarOperacion = (clave: string, o: OpcionesMutacion = {}) => post('/api/ops-ocultas', { clave }, o)
