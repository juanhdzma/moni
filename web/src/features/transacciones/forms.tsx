import type { OpenerCtx } from '../../shell/openers'
import type { Transaccion } from '../../types'

export function openTxForm(ctx: OpenerCtx, tx: Transaccion | null = null): void {
  if (tx?.tipo === 'transfer') return
  ctx.openModal(tx ? 'Editar movimiento' : 'Nuevo movimiento', <div />)
}

export function openTxFormById(ctx: OpenerCtx, id: number): void {
  openTxForm(ctx, ctx.estado.transacciones.find((t) => t._id === id) ?? null)
}
