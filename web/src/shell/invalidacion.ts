import type { Entidad } from '@/types'

export type { Entidad }

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

export function entidadesDeHeader(valor: string | null): Entidad[] {
  if (!valor) return TODAS_LAS_ENTIDADES
  const nombres = valor.split(',').map((n) => n.trim())
  return nombres.every((n) => TODAS_LAS_ENTIDADES.includes(n as Entidad)) ? (nombres as Entidad[]) : TODAS_LAS_ENTIDADES
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
  proximasOperaciones: ['deudas', 'inversiones', 'recurrentes', 'opsOcultas', 'ajustes'],
  opsOcultas: ['opsOcultas', 'deudas', 'inversiones', 'recurrentes'],
  listadoTransacciones: ['transacciones', 'categorias', 'ajustes'],
  opcionesTransaccion: ['deudas', 'categorias'],
  resumenDeudas: ['deudas', 'ajustes'],
  resumenInversiones: ['inversiones', 'ajustes'],
  resumenActivos: ['activos', 'ajustes'],
  resumenRecurrentes: ['recurrentes', 'categorias', 'ajustes'],
} satisfies Record<string, Entidad[]>
