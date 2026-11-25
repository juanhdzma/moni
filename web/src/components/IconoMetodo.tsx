import { FRANQUICIA_ICONS } from '@/lib/format'

const EFECTIVO = '/assets/icons/efectivo.svg'

export function IconoMetodo({ icono }: { icono: string }) {
  const src = icono === 'efectivo' ? EFECTIVO : (FRANQUICIA_ICONS[icono] ?? FRANQUICIA_ICONS.Otra)
  return <img src={src} width="18" height="18" alt="" className="shrink-0" />
}
