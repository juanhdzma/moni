import { cargarMetaUnaVez } from '@/shell/hooks/useMeta'
import type { Entidad } from '@/types'

export type { Entidad }

export type Versiones = Partial<Record<Entidad, number>>

export const VERSIONES_INICIALES: Versiones = {}

export async function afectaAlBootstrap(afectadas: Entidad[]): Promise<boolean> {
  const { entidades_del_bootstrap } = await cargarMetaUnaVez()
  return afectadas.some((e) => entidades_del_bootstrap.includes(e))
}

export async function entidadesDeHeader(valor: string | null): Promise<Entidad[]> {
  const { entidades } = await cargarMetaUnaVez()
  if (valor === null) return entidades
  const nombres = valor.split(',').filter((n) => n.trim() !== '').map((n) => n.trim())
  return nombres.every((n) => entidades.includes(n as Entidad)) ? (nombres as Entidad[]) : entidades
}

export function subirVersiones(actuales: Versiones, afectadas: Entidad[]): Versiones {
  const nuevas = { ...actuales }
  for (const e of afectadas) nuevas[e] = (nuevas[e] ?? 0) + 1
  return nuevas
}

export const firmaDeVersiones = (versiones: Versiones, entidades: Entidad[]): string =>
  entidades.map((e) => versiones[e] ?? 0).join('.')

export const DEPENDENCIAS_DE_VISTA = {
  resumenDashboard: ['transacciones', 'deudas', 'inversiones', 'activos', 'ajustes'],
  evolucion: ['transacciones', 'deudas', 'inversiones', 'activos', 'ajustes'],
  esteMes: ['transacciones'],
  gastos: ['transacciones'],
  movimientos: ['transacciones'],
  proximasOperaciones: ['deudas', 'inversiones', 'recurrentes', 'opsOcultas', 'ajustes'],
  opsOcultas: ['opsOcultas', 'deudas', 'inversiones', 'recurrentes'],
  listadoTransacciones: ['transacciones', 'deudas', 'categorias', 'ajustes'],
  opcionesTransaccion: ['deudas', 'categorias'],
  resumenDeudas: ['deudas', 'ajustes'],
  resumenInversiones: ['inversiones', 'ajustes'],
  resumenActivos: ['activos', 'ajustes'],
  resumenRecurrentes: ['recurrentes', 'categorias', 'ajustes'],
} satisfies Record<string, Entidad[]>
