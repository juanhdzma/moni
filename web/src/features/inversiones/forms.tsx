import type { OpenerCtx } from '../../shell/openers'
import type { Inversion } from '../../types'

export function openInvForm(ctx: OpenerCtx, inv: Inversion | null = null): void {
  ctx.openModal(inv ? 'Editar inversión' : 'Nueva inversión', <div />)
}

export function openInvFormById(ctx: OpenerCtx, id: number): void {
  openInvForm(ctx, ctx.estado.inversiones.find((i) => i._id === id) ?? null)
}

export function openInvYieldFormById(ctx: OpenerCtx, id: number): void {
  const inv = ctx.estado.inversiones.find((i) => i._id === id)
  if (!inv) return
  ctx.openModal(`Registrar rendimiento · ${inv.nombre}`, <div />)
}
