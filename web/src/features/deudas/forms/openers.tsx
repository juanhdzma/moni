import { openConFila, type OpenerCtx } from '@/shell/hooks/openers'
import { cargarDeuda } from '../../../lib/api'
import type { Deuda } from '../../../types'
import { AdelantoForm } from './AdelantoForm'
import { DeudaForm } from './DeudaForm'
import { PagoForm } from './PagoForm'

export function openDeudaForm(ctx: OpenerCtx, d: Deuda | null = null): void {
  ctx.openModal(d ? 'Editar deuda' : 'Nueva deuda', <DeudaForm d={d} />)
}

export function openDeudaFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarDeuda(id), (d) => openDeudaForm(ctx, d))
}

export function openDeudaPayFormById(ctx: OpenerCtx, id: number, liquidar = false): void {
  openConFila(
    ctx,
    () => cargarDeuda(id),
    (d) => ctx.openModal(liquidar ? `Abonar · ${d.nombre}` : `Pagar cuota · ${d.nombre}`, <PagoForm d={d} liquidar={liquidar} />),
  )
}

export function openDeudaAdelantoFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarDeuda(id), (d) => ctx.openModal(`Pedir adelanto · ${d.nombre}`, <AdelantoForm d={d} />))
}
