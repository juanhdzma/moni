import { openConFila, type OpenerCtx } from '@/shell/hooks/openers'
import { cargarTx } from '../../../lib/api'
import type { Transaccion } from '../../../types'
import { TxForm } from './TxForm'

export function openTxForm(ctx: OpenerCtx, tx: Transaccion | null = null): void {
  if (tx?.tipo === 'transfer') return
  ctx.openModal(tx ? 'Editar movimiento' : 'Nuevo movimiento', <TxForm tx={tx} />)
}

export function openTxFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarTx(id), (tx) => openTxForm(ctx, tx))
}
