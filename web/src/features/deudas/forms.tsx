import type { OpenerCtx } from '../../shell/openers'
import type { Deuda } from '../../types'

export function openDeudaForm(ctx: OpenerCtx, d: Deuda | null = null): void {
  ctx.openModal(d ? 'Editar deuda' : 'Nueva deuda', <div />)
}

export function openDeudaFormById(ctx: OpenerCtx, id: number): void {
  openDeudaForm(ctx, ctx.estado.deudas.find((d) => d._id === id) ?? null)
}

export function openDeudaPayFormById(ctx: OpenerCtx, id: number, liquidar = false): void {
  const d = ctx.estado.deudas.find((x) => x._id === id)
  if (!d) return
  ctx.openModal(liquidar ? `Abonar · ${d.nombre}` : `Pagar cuota · ${d.nombre}`, <div />)
}
