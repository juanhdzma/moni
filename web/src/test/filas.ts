import type { Activo, Deuda, Inversion, Recurrente, Transaccion } from '../types'

export interface Filas {
  transacciones?: Transaccion[]
  deudas?: Deuda[]
  inversiones?: Inversion[]
  activos?: Activo[]
  recurrentes?: Recurrente[]
}

const RUTA_POR_COLECCION: Record<keyof Filas, string> = {
  transacciones: 'tx',
  deudas: 'deuda',
  inversiones: 'inv',
  activos: 'activo',
  recurrentes: 'rec',
}

const registradas = new Map<string, unknown>()

export function registrarFilas(filas: Filas): void {
  for (const [coleccion, ruta] of Object.entries(RUTA_POR_COLECCION)) {
    for (const fila of filas[coleccion as keyof Filas] ?? []) registradas.set(`/api/${ruta}/${fila.id}`, fila)
  }
}

export const filaRegistrada = (url: string): unknown => registradas.get(url)
