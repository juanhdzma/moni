import type { Entidad } from '@/types'

export const HEADER_AFECTADAS = 'X-Moni-Afectadas'

const ENTIDAD_POR_RECURSO: Record<string, Entidad> = {
  tx: 'transacciones',
  deuda: 'deudas',
  inv: 'inversiones',
  activo: 'activos',
  rec: 'recurrentes',
}

const SIN_MOVIMIENTO = ['valor', 'pausar']

const cuerpoDe = (body: unknown): Record<string, unknown> => (typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {})

export function afectadasPorDefecto(method: string, url: string, body: unknown): Entidad[] | null {
  if (method === 'GET' || /\/preview$|^\/api\/(auth|push)\//.test(url)) return null
  const cuerpo = cuerpoDe(body)
  const extra: Entidad[] = cuerpo.op_clave ? ['opsOcultas'] : []
  if (/^\/api\/ops-ocultas/.test(url)) return ['opsOcultas']
  const m = /^\/api\/(tx|deuda|inv|activo|rec)(?:\/\d+)?(?:\/([a-z]+))?$/.exec(url)
  if (!m) return null
  const [, recurso = '', accion = ''] = m
  const propia = ENTIDAD_POR_RECURSO[recurso] as Entidad
  if (recurso === 'tx') return [...(method === 'POST' && cuerpo.tarjeta_id == null ? ['transacciones' as const] : ['transacciones' as const, 'deudas' as const]), ...extra]
  if (SIN_MOVIMIENTO.includes(accion)) return [propia]
  const escribeTx = accion
    ? cuerpo.registrar_tx !== false && cuerpo.capitaliza !== true
    : (method === 'POST' && cuerpo.crear_tx === true) || (method === 'DELETE' && recurso === 'deuda')
  return [propia, ...(escribeTx ? (['transacciones'] as const) : []), ...extra]
}
