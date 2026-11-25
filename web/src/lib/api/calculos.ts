import type {
  ModoPago,
  PreviewAdelanto,
  PreviewAporte,
  PreviewPago,
  PreviewValor,
  PreviewVenta,
  Tasa,
} from '@/types'
import { get, post, query } from './client'

export const cargarTasa = (valor: number, tipo: string) => get<Tasa>(`/api/calc/tasa${query({ valor, tipo })}`)

export const previewPago = (id: number, body: { total_pagado: number; nuevo_saldo?: number; modo: ModoPago }) =>
  post<PreviewPago | null>(`/api/deuda/${id}/pago/preview`, body)
export const previewAdelanto = (id: number, body: { monto: number; nuevo_saldo?: number | null; disponible_nuevo?: number | null }) =>
  post<PreviewAdelanto>(`/api/deuda/${id}/adelanto/preview`, body)
export const previewValorInversion = (id: number, nuevo_valor: number) =>
  post<PreviewValor | null>(`/api/inv/${id}/valor/preview`, { nuevo_valor })
export const previewAporte = (id: number, monto: number) => post<PreviewAporte | null>(`/api/inv/${id}/aporte/preview`, { monto })
export const previewValorActivo = (id: number, nuevo_valor: number) =>
  post<PreviewValor | null>(`/api/activo/${id}/valor/preview`, { nuevo_valor })
export const previewVenta = (id: number, precio: number) => post<PreviewVenta | null>(`/api/activo/${id}/venta/preview`, { precio })
