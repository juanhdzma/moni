import { Monto } from '@/components/monto'
import { pct } from '@/lib/format'

interface Props {
  valor: number
  porcentaje?: number
}

export function Variacion({ valor, porcentaje }: Props) {
  return (
    <span>
      <Monto valor={valor} />
      {porcentaje !== undefined && (
        <>
          {' '}
          <span className="text-xs font-medium">
            (<Monto valor={porcentaje} formato={pct} sufijo="%" />)
          </span>
        </>
      )}
    </span>
  )
}
