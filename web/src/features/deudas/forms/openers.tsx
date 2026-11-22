import type { OpenerCtx } from '@/shell/hooks/openers'
import type { Deuda } from '../../../types'
import { AdelantoForm } from './AdelantoForm'
import { DeudaForm } from './DeudaForm'
import { PagoForm } from './PagoForm'

export function openDeudaForm(ctx: OpenerCtx, d: Deuda | null = null): void {
  ctx.openModal(d ? 'Editar deuda' : 'Nueva deuda', <DeudaForm d={d} />)
}

export function openDeudaFormById(ctx: OpenerCtx, id: number): void {
  openDeudaForm(ctx, ctx.estado.deudas.find((d) => d._id === id) ?? null)
}

export function openDeudaPayFormById(ctx: OpenerCtx, id: number, liquidar = false): void {
  const d = ctx.estado.deudas.find((x) => x._id === id)
  if (!d) return
  ctx.openModal(liquidar ? `Abonar · ${d.nombre}` : `Pagar cuota · ${d.nombre}`, <PagoForm d={d} liquidar={liquidar} />)
}

export function openDeudaAdelantoFormById(ctx: OpenerCtx, id: number): void {
  const d = ctx.estado.deudas.find((x) => x._id === id)
  if (!d) return
  ctx.openModal(`Pedir adelanto · ${d.nombre}`, <AdelantoForm d={d} />)
}
