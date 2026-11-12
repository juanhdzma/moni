import type { OpenerCtx } from '../../shell/openers'
import type { Recurrente } from '../../types'

export function openRecurrenteForm(ctx: OpenerCtx, item: Recurrente | null = null): void {
  ctx.openModal(item ? 'Editar recurrente' : 'Nuevo recurrente', <div />)
}

export function openRecurrenteFormById(ctx: OpenerCtx, id: number): void {
  openRecurrenteForm(ctx, ctx.estado.recurrentes.find((r) => r._id === id) ?? null)
}

export function openRecurrenteMaterializeFormById(ctx: OpenerCtx, id: number, dateISO: string): void {
  const r = ctx.estado.recurrentes.find((x) => x._id === id)
  if (!r) return
  void dateISO
  ctx.openModal(`Registrar · ${r.nombre}`, <div />)
}
