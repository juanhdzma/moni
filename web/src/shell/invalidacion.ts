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

type Accion = 'add' | 'update' | 'delete'

const ENTIDAD_POR_RECURSO: Record<CrudEntity, Entidad> = {
  tx: 'transacciones',
  deuda: 'deudas',
  inv: 'inversiones',
  activo: 'activos',
  rec: 'recurrentes',
}

const ACCIONES_CON_MOVIMIENTO = ['pago', 'adelanto', 'aporte', 'retiro', 'venta', 'rendimiento']
const ACCIONES_SIN_MOVIMIENTO = ['valor', 'pausar']

const conOpOculta = (entidades: Entidad[], opClave: string | null): Entidad[] => (opClave ? [...entidades, 'opsOcultas'] : entidades)

const escribeTx = (cuerpo: Record<string, unknown>): boolean => cuerpo.registrar_tx !== false && cuerpo.capitaliza !== true

export function entidadesAfectadasPor(recurso: CrudEntity, accion: Accion, payload: object, opClave: string | null = null): Entidad[] {
  const cuerpo = payload as Record<string, unknown>
  const propia = ENTIDAD_POR_RECURSO[recurso]
  if (recurso === 'tx') {
    const tocaTarjeta = accion !== 'add' || cuerpo.tarjeta_id != null
    return conOpOculta(tocaTarjeta ? ['transacciones', 'deudas'] : ['transacciones'], opClave)
  }
  const escribeMovimiento = accion === 'add' ? cuerpo.crear_tx === true : accion === 'delete' && recurso === 'deuda'
  return escribeMovimiento ? [propia, 'transacciones'] : [propia]
}

export function entidadesAfectadasPorRuta(path: string, payload: unknown = null, opClave: string | null = null): Entidad[] {
  if (/^\/api\/ops-ocultas(?:[/?]|$)/.test(path)) return ['opsOcultas']
  const m = /^\/api\/(deuda|inv|activo|rec)\/\d+\/([a-z]+)$/.exec(path)
  const recurso = m?.[1] as CrudEntity | undefined
  const accion = m?.[2] ?? ''
  if (!recurso) return TODAS_LAS_ENTIDADES
  const propia = ENTIDAD_POR_RECURSO[recurso]
  if (ACCIONES_SIN_MOVIMIENTO.includes(accion)) return [propia]
  if (!ACCIONES_CON_MOVIMIENTO.includes(accion)) return TODAS_LAS_ENTIDADES
  const cuerpo = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
  return conOpOculta(escribeTx(cuerpo) ? [propia, 'transacciones'] : [propia], opClave)
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
