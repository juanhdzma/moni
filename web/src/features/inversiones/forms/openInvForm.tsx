import { useOpenerCtx, type OpenerCtx } from '@/shell/hooks/openers'
import { useModal } from '@/shell/providers/ModalProvider'
import type { Inversion } from '../../../types'
import { InversionForm } from './InversionForm'

export function openInvForm(ctx: OpenerCtx, inv: Inversion | null = null): void {
  ctx.openModal(inv ? 'Editar inversión' : 'Nueva inversión', <InversionForm inv={inv} />)
}

export function openInvFormById(ctx: OpenerCtx, id: number): void {
  openInvForm(ctx, ctx.estado.inversiones.find((i) => i._id === id) ?? null)
}

export function useEditarInversion(inv: Inversion): () => void {
  const ctx = useOpenerCtx()
  const { closeModal } = useModal()
  return () => {
    closeModal()
    openInvFormById(ctx, inv._id)
  }
}
