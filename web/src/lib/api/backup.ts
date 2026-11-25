import { apiFetch, type AlAfectar } from './client'

interface ResultadoImport {
  counts: Record<string, number>
  texto: string
}

export const cargarBackup = () => apiFetch<Record<string, unknown>>('/api/backup')
export const importarBackup = (payload: Record<string, unknown>, clave: string, onAfectadas?: AlAfectar) =>
  apiFetch<ResultadoImport>('/api/import', { method: 'POST', body: { ...payload, clave }, onAfectadas })
export const vaciarDatos = (clave: string, onAfectadas?: AlAfectar) =>
  apiFetch<{ ok: boolean }>('/api/truncate', { method: 'POST', body: { clave }, onAfectadas })
