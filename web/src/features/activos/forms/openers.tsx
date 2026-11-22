import type { OpenerCtx } from '@/shell/hooks/openers'
import type { Activo } from '../../../types'
import { ActivoForm } from './ActivoForm'
import { ActivoValorForm } from './ActivoValorForm'
import { ActivoVentaForm } from './ActivoVentaForm'

export function openActivoForm(ctx: OpenerCtx, activo: Activo | null = null): void {
  ctx.openModal(activo ? 'Editar activo' : 'Nuevo activo', <ActivoForm activo={activo} />)
}

export function openActivoUpdateForm(ctx: OpenerCtx, a: Activo): void {
  ctx.openModal(`Actualizar valor · ${a.nombre}`, <ActivoValorForm activo={a} />)
}

export function openActivoSellForm(ctx: OpenerCtx, a: Activo): void {
  ctx.openModal(`Vender · ${a.nombre}`, <ActivoVentaForm activo={a} />)
}
