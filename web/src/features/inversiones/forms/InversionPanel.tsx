import { ModalPanel } from '../../../controls/ModalPanel'
import { cop } from '../../../lib/format'
import type { Inversion } from '../../../types'

export function InversionPanel({ inv }: { inv: Inversion }) {
  return (
    <ModalPanel
      izquierda={{ label: 'Valor actual', valor: cop(inv.valor_actual), clase: 'text-inversiones-text' }}
      derecha={{ label: 'Invertido', valor: cop(inv.monto_invertido) }}
    />
  )
}
