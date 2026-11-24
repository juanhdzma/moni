import { apiFetch } from './client'

interface ResultadoImport {
  counts: Record<string, number>
  texto: string
}

export const cargarBackup = () => apiFetch<Record<string, unknown>>('/api/backup')
export const importarBackup = (payload: unknown) => apiFetch<ResultadoImport>('/api/import', { method: 'POST', body: payload })
