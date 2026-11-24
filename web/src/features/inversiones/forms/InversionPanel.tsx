import { ModalPanel } from '../../../controls/ModalPanel'
import { useMoneda } from '@/shell/hooks/useMoneda'
import type { Inversion } from '../../../types'

export function InversionPanel({ inv }: { inv: Inversion }) {
  const { cop } = useMoneda()
  return (
    <ModalPanel
      izquierda={{ label: 'Valor actual', valor: cop(inv.valor_actual), clase: 'text-inversiones-text' }}
      derecha={{ label: 'Invertido', valor: cop(inv.monto_invertido) }}
    />
  )
}
