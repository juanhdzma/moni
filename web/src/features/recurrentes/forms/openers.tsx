import { openConFila, type OpenerCtx } from '@/shell/hooks/acciones/openers'
import { cargarRecurrente } from '@/lib/api'
import type { Recurrente } from '@/types'
import { MaterializeForm } from './MaterializeForm'
import { RecurrenteForm } from './RecurrenteForm'

export function openRecurrenteForm(ctx: OpenerCtx, item: Recurrente | null = null): void {
  ctx.openModal(item ? 'Editar recurrente' : 'Nuevo recurrente', <RecurrenteForm item={item} />)
}

export function openRecurrenteFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarRecurrente(id), (item) => openRecurrenteForm(ctx, item))
}

export function openRecurrenteMaterializeFormById(ctx: OpenerCtx, id: number, dateISO: string): void {
  openConFila(
    ctx,
    () => cargarRecurrente(id),
    (r) => ctx.openModal(`Registrar · ${r.nombre}`, <MaterializeForm r={r} dateISO={dateISO} />),
  )
}
