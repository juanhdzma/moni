import { openConFila, type OpenerCtx } from '@/shell/hooks/acciones/openers'
import { cargarActivo } from '@/lib/api'
import type { Activo } from '@/types'
import { ActivoForm } from './ActivoForm'
import { ActivoValorForm } from './ActivoValorForm'
import { ActivoVentaForm } from './ActivoVentaForm'

export function openActivoForm(ctx: OpenerCtx, activo: Activo | null = null): void {
  ctx.openModal(activo ? 'Editar activo' : 'Nuevo activo', <ActivoForm activo={activo} />)
}

export function openActivoFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarActivo(id), (a) => openActivoForm(ctx, a))
}

export function openActivoUpdateFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarActivo(id), (a) => ctx.openModal(`Actualizar valor · ${a.nombre}`, <ActivoValorForm activo={a} />))
}

export function openActivoSellFormById(ctx: OpenerCtx, id: number): void {
  openConFila(ctx, () => cargarActivo(id), (a) => ctx.openModal(`Vender · ${a.nombre}`, <ActivoVentaForm activo={a} />))
}
