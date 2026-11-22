import type { CrudEntity } from '@/types'

export type Entidad = 'transacciones' | 'deudas' | 'inversiones' | 'activos' | 'recurrentes'

export const TODAS_LAS_ENTIDADES: Entidad[] = ['transacciones', 'deudas', 'inversiones', 'activos', 'recurrentes']

export type Versiones = Record<Entidad, number>

export const VERSIONES_INICIALES: Versiones = { transacciones: 0, deudas: 0, inversiones: 0, activos: 0, recurrentes: 0 }

const AFECTADAS_POR_RECURSO: Record<CrudEntity, Entidad[]> = {
  tx: ['transacciones', 'deudas'],
  deuda: ['deudas', 'transacciones'],
  inv: ['inversiones', 'transacciones'],
  activo: ['activos', 'transacciones'],
  rec: ['recurrentes'],
}

export const entidadesAfectadasPor = (recurso: CrudEntity): Entidad[] => AFECTADAS_POR_RECURSO[recurso]

export function entidadesAfectadasPorRuta(path: string): Entidad[] {
  const recurso = /^\/api\/([a-z]+)(?:\/|$)/.exec(path)?.[1]
  return recurso && recurso in AFECTADAS_POR_RECURSO ? AFECTADAS_POR_RECURSO[recurso as CrudEntity] : TODAS_LAS_ENTIDADES
}

export function subirVersiones(actuales: Versiones, afectadas: Entidad[]): Versiones {
  const nuevas = { ...actuales }
  for (const e of afectadas) nuevas[e] += 1
  return nuevas
}

export const firmaDeVersiones = (versiones: Versiones, entidades: Entidad[]): string =>
  entidades.map((e) => versiones[e]).join('.')
