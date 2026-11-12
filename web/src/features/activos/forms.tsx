import type { OpenerCtx } from '../../shell/openers'
import type { Activo } from '../../types'

export function openActivoForm(ctx: OpenerCtx, activo: Activo | null = null): void {
  ctx.openModal(activo ? 'Editar activo' : 'Nuevo activo', <div />)
}

export function openActivoFormById(ctx: OpenerCtx, id: number): void {
  openActivoForm(ctx, ctx.estado.activos.find((a) => a._id === id) ?? null)
}
