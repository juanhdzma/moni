import { openConFila, type OpenerCtx } from '@/shell/hooks/acciones/openers'
import { cargarMetaUnaVez } from '@/shell/hooks/datos/useMeta'
import { cargarTx } from '@/lib/api'
import type { Transaccion } from '@/types'
import { TxForm } from './TxForm'

export function openTxForm(ctx: OpenerCtx, tx: Transaccion | null = null): void {
  ctx.openModal(tx ? 'Editar movimiento' : 'Nuevo movimiento', <TxForm tx={tx} />)
}

export function openTxFormById(ctx: OpenerCtx, id: number): void {
  openConFila(
    ctx,
    () => Promise.all([cargarTx(id), cargarMetaUnaVez()]),
    ([tx, meta]) => {
      if (meta.tipos_manuales.find((t) => t.value === tx.tipo)?.editable) openTxForm(ctx, tx)
    },
  )
}
