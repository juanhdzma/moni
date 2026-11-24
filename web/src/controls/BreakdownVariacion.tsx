import type { PreviewValor } from '@/types'
import { Breakdown, BreakdownRow } from './Breakdown'
import { Variacion } from './Variacion'

interface Props {
  id: string
  idDelta: string
  idTotal: string
  labelTotal: string
  visible: boolean
  preview: PreviewValor | null
}

export function BreakdownVariacion({ id, idDelta, idTotal, labelTotal, visible, preview }: Props) {
  return (
    <Breakdown id={id} visible={visible}>
      <BreakdownRow id={idDelta} label="Cambio desde último">
        {preview ? <Variacion valor={preview.delta} /> : '—'}
      </BreakdownRow>
      <BreakdownRow id={idTotal} label={labelTotal}>
        {preview ? <Variacion valor={preview.total} porcentaje={preview.total_pct} /> : '—'}
      </BreakdownRow>
    </Breakdown>
  )
}
