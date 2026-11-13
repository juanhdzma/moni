import { MAX_FIGURAS, partirFiguras, type PictoNombre } from '@/lib/isotipo'
import { cn } from '@/lib/utils'
import { EXTENSION, Pictograma } from './Pictograma'

export function FilaFiguras({
  valor,
  unidad,
  picto,
  className,
}: {
  valor: number
  unidad: number
  picto: PictoNombre
  className?: string
}) {
  const { enteras, resto } = partirFiguras(valor, unidad)
  const [x0, x1] = EXTENSION[picto]
  const corte = ((24 - (x0 + resto * (x1 - x0))) / 24) * 100
  return (
    <div
      aria-hidden="true"
      data-figuras={enteras + resto}
      className={cn('grid min-h-5 items-center gap-x-[3px]', className)}
      style={{ gridTemplateColumns: `repeat(${MAX_FIGURAS}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: Math.min(enteras, MAX_FIGURAS) }, (_, i) => (
        <Pictograma key={i} nombre={picto} className="aspect-square w-full" />
      ))}
      {resto > 0 && enteras < MAX_FIGURAS && (
        <Pictograma nombre={picto} className="aspect-square w-full" style={{ clipPath: `inset(0 ${corte.toFixed(1)}% 0 0)` }} />
      )}
    </div>
  )
}
