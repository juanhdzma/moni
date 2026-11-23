import type { CrudEntity } from '@/types'

export type Entidad =
  | 'transacciones'
  | 'deudas'
  | 'inversiones'
  | 'activos'
  | 'recurrentes'
  | 'categorias'
  | 'ajustes'
  | 'opsOcultas'

export const TODAS_LAS_ENTIDADES: Entidad[] = [
  'transacciones',
  'deudas',
  'inversiones',
  'activos',
  'recurrentes',
  'categorias',
  'ajustes',
  'opsOcultas',
]

export type Versiones = Record<Entidad, number>

export const VERSIONES_INICIALES: Versiones = {
  transacciones: 0,
  deudas: 0,
  inversiones: 0,
  activos: 0,
  recurrentes: 0,
  categorias: 0,
  ajustes: 0,
  opsOcultas: 0,
}

const ENTIDADES_DEL_BOOTSTRAP: Entidad[] = ['activos', 'inversiones', 'ajustes', 'categorias']

export const afectaAlBootstrap = (afectadas: Entidad[]): boolean => afectadas.some((e) => ENTIDADES_DEL_BOOTSTRAP.includes(e))

const AFECTADAS_POR_RECURSO: Record<CrudEntity, Entidad[]> = {
  tx: ['transacciones', 'deudas'],
  deuda: ['deudas', 'transacciones'],
  inv: ['inversiones', 'transacciones'],
  activo: ['activos', 'transacciones'],
  rec: ['recurrentes'],
}

export const entidadesAfectadasPor = (recurso: CrudEntity): Entidad[] => AFECTADAS_POR_RECURSO[recurso]

export function entidadesAfectadasPorRuta(path: string): Entidad[] {
  if (/^\/api\/ops-ocultas(?:[/?]|$)/.test(path)) return ['opsOcultas']
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

export const DEPENDENCIAS_DE_VISTA = {
  resumenDashboard: ['transacciones', 'deudas', 'inversiones', 'activos', 'ajustes'],
  evolucion: ['transacciones', 'deudas', 'inversiones', 'activos', 'ajustes'],
  esteMes: ['transacciones'],
  gastos: ['transacciones'],
  movimientos: ['transacciones'],
  proximasOperaciones: ['transacciones', 'deudas', 'inversiones', 'recurrentes', 'opsOcultas', 'ajustes'],
  opsOcultas: ['opsOcultas', 'transacciones', 'deudas', 'inversiones', 'recurrentes'],
  listadoTransacciones: ['transacciones', 'categorias', 'ajustes'],
  opcionesTransaccion: ['transacciones', 'deudas', 'categorias'],
  resumenDeudas: ['deudas', 'ajustes'],
  resumenInversiones: ['inversiones', 'ajustes'],
  resumenActivos: ['activos', 'ajustes'],
  resumenRecurrentes: ['recurrentes', 'categorias', 'ajustes'],
} satisfies Record<string, Entidad[]>
