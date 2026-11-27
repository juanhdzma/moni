import type { PreviewValor } from '@/types'
import { Breakdown, BreakdownRow } from '@/controls/desglose/Breakdown'
import { Variacion } from '@/components/Monto'

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
        {preview ? <Variacion valor={preview.delta} tono={preview.delta_tono} signo={preview.delta_signo} /> : '—'}
      </BreakdownRow>
      <BreakdownRow id={idTotal} label={labelTotal}>
        {preview ? <Variacion valor={preview.total} tono={preview.total_tono} signo={preview.total_signo} porcentaje={preview.total_pct} /> : '—'}
      </BreakdownRow>
    </Breakdown>
  )
}
