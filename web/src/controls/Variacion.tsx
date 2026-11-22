import { cop, pct, signStr } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  valor: number
  porcentaje?: number
}

export function Variacion({ valor, porcentaje }: Props) {
  return (
    <span className={cn(valor >= 0 ? 'text-inversiones-text' : 'text-deudas')}>
      {signStr(valor)}
      {cop(Math.abs(valor))}
      {porcentaje !== undefined && (
        <>
          {' '}
          <span className="text-xs font-medium">
            ({signStr(porcentaje)}
            {pct(Math.abs(porcentaje))}%)
          </span>
        </>
      )}
    </span>
  )
}
