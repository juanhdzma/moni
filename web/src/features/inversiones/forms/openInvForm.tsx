import { openConFila, useCerrarYAbrir, type OpenerCtx } from '@/shell/hooks/openers'
import { cargarInversion } from '../../../lib/api'
import type { Inversion } from '../../../types'
import { InversionForm } from './InversionForm'

export function openInvForm(ctx: OpenerCtx, inv: Inversion | null = null): void {
  ctx.openModal(inv ? 'Editar inversión' : 'Nueva inversión', <InversionForm inv={inv} />)
}

export function openInvFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarInversion(id), (inv) => openInvForm(ctx, inv))
}

export function useEditarInversion(inv: Inversion): () => void {
  return useCerrarYAbrir((ctx) => openInvFormById(ctx, inv.id))
}
