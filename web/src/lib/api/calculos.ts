import type {
  PreviewAdelanto,
  PreviewAporte,
  PreviewPago,
  PreviewValor,
  PreviewVenta,
  Tasa,
} from '../../types'
import { get, post, query } from './client'

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
