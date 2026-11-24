import type { ReactNode } from 'react'
import { openConFila, useCerrarYAbrir, type OpenerCtx } from '@/shell/hooks/openers'
import { cargarInversion } from '../../../lib/api'
import type { Inversion } from '../../../types'
import { AporteForm } from './AporteForm'
import { InversionForm } from './InversionForm'
import { RendimientoForm } from './RendimientoForm'
import { RetiroForm } from './RetiroForm'
import { ValorForm } from './ValorForm'

export function openInvForm(ctx: OpenerCtx, inv: Inversion | null = null): void {
  ctx.openModal(inv ? 'Editar inversión' : 'Nueva inversión', <InversionForm inv={inv} />)
}

export function openInvFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarInversion(id), (inv) => openInvForm(ctx, inv))
}

export function useEditarInversion(inv: Inversion): () => void {
  return useCerrarYAbrir((ctx) => openInvFormById(ctx, inv.id))
}

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
