import type { CSSProperties } from 'react'
import { MAX_FIGURAS, partirFiguras } from '@/lib/isotipo'
import { cn } from '@/lib/utils'

export function Bloque({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={cn('block aspect-square rounded-[2px] bg-current', className)} style={style} />
}

export function FilaFiguras({ valor, unidad, className }: { valor: number; unidad: number; className?: string }) {
  const { enteras, resto } = partirFiguras(valor, unidad)
  return (
    <div
      aria-hidden="true"
      data-figuras={enteras + resto}
      className={cn('grid min-h-4 items-center gap-x-[3px]', className)}
      style={{ gridTemplateColumns: `repeat(${MAX_FIGURAS}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: Math.min(enteras, MAX_FIGURAS) }, (_, i) => (
        <Bloque key={i} />
      ))}
      {resto > 0 && enteras < MAX_FIGURAS && <Bloque style={{ clipPath: `inset(0 ${(1 - resto) * 100}% 0 0)` }} />}
    </div>
  )
}
