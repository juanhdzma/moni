import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  activo: boolean
  aviso: boolean
  onClick: () => void
  claseBase: string
  claseActivo: string
  claseInactivo: string
  children: ReactNode
}

export function NavButton({ id, activo, aviso, onClick, claseBase, claseActivo, claseInactivo, children }: Props) {
  return (
    <button type="button" data-tab={id} aria-current={activo ? 'page' : undefined} onClick={onClick} className={cn(claseBase, activo ? `active ${claseActivo}` : claseInactivo, aviso && 'has-warning')}>
      {children}
      {aviso && (
        <>
          <span aria-hidden="true" className="ml-1.5 inline-block size-1.5 -translate-y-2 rounded-full bg-alerta" />
          <span className="sr-only"> (precios sin actualizar)</span>
        </>
      )}
    </button>
  )
}
