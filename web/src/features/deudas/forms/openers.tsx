import { openConFila, type OpenerCtx } from '@/shell/hooks/openers'
import { cargarDeuda } from '../../../lib/api'
import type { Deuda, ModoPago } from '../../../types'
import { AdelantoForm } from './AdelantoForm'
import { DeudaForm } from './DeudaForm'
import { ETIQUETA_PAGO, PagoForm } from './PagoForm'

export function openDeudaForm(ctx: OpenerCtx, d: Deuda | null = null): void {
  ctx.openModal(d ? 'Editar deuda' : 'Nueva deuda', <DeudaForm d={d} />)
}

export function openDeudaFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarDeuda(id), (d) => openDeudaForm(ctx, d))
}

export function openDeudaPayFormById(ctx: OpenerCtx, id: number, modo: ModoPago = 'cuota'): void {
  openConFila(
    ctx,
    () => cargarDeuda(id),
    (d) => ctx.openModal(`${ETIQUETA_PAGO[modo]} · ${d.nombre}`, <PagoForm d={d} modo={modo} />),
  )
}

export function openDeudaAdelantoFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarDeuda(id), (d) => ctx.openModal(`Pedir adelanto · ${d.nombre}`, <AdelantoForm d={d} />))
}
