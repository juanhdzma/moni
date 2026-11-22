import type { ReactNode } from 'react'
import { openConFila, type OpenerCtx } from '@/shell/hooks/openers'
import { cargarInversion } from '../../../lib/api'
import type { Inversion } from '../../../types'
import { AporteForm } from './AporteForm'
import { RendimientoForm } from './RendimientoForm'
import { RetiroForm } from './RetiroForm'
import { ValorForm } from './ValorForm'

export { openInvForm, openInvFormById } from './openInvForm'

function openWithInv(ctx: OpenerCtx, id: number, title: string, render: (inv: Inversion) => ReactNode): void {
  openConFila(ctx, () => cargarInversion(id), (inv) => ctx.openModal(`${title} · ${inv.nombre}`, render(inv)))
}

export const openInvYieldFormById = (ctx: OpenerCtx, id: number) =>
  openWithInv(ctx, id, 'Registrar rendimiento', (inv) => <RendimientoForm inv={inv} />)

export const openInvUpdateValueFormById = (ctx: OpenerCtx, id: number) =>
  openWithInv(ctx, id, 'Actualizar valor', (inv) => <ValorForm inv={inv} />)

export const openInvAddMoreFormById = (ctx: OpenerCtx, id: number) =>
  openWithInv(ctx, id, 'Invertir más', (inv) => <AporteForm inv={inv} />)

export const openInvRetirarFormById = (ctx: OpenerCtx, id: number) =>
  openWithInv(ctx, id, 'Retirar', (inv) => <RetiroForm inv={inv} />)
