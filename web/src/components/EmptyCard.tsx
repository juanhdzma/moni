import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  titulo: string
  texto?: ReactNode
  icono?: ReactNode
  como?: ElementType
  className?: string
}

export function EmptyCard({ titulo, texto, icono, como: Etiqueta = 'div', className }: Props) {
  return (
    <Etiqueta className={cn('empty flex flex-col items-center gap-1 py-6 text-center', className)}>
      {icono && <div className="text-muted-foreground">{icono}</div>}
      <div className="text-sm font-semibold">{titulo}</div>
      {texto && <div className="text-sm text-muted-foreground">{texto}</div>}
    </Etiqueta>
  )
}
