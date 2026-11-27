import { Panel } from '@/components/Panel'
import { Campo } from '@/controls/inputs/Campo'
import { Hint } from '@/controls/forms/FormStatus'
import { Select } from '@/controls/inputs/Select'
import { guardarAjustes } from '@/lib/api'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useData } from '@/shell/providers/DataProvider'

export function Moneda() {
  const { estado, mutar, conBanner } = useData()
  const meta = useMeta()
  const t = meta?.textos.moneda
  return (
    <Panel id="settings-currency-card" titulo={t?.titulo ?? ''}>
      <Campo id="settings-currency-select" label={t?.label ?? ''} className="mb-0">
        <Select
          compact
          id="settings-currency-select"
          value={estado.ajustes.moneda_simbolo}
          options={meta?.monedas ?? []}
          onChange={(symbol) => void conBanner(() => mutar((onAfectadas) => guardarAjustes({ moneda_simbolo: symbol }, onAfectadas)))}
        />
      </Campo>
      <Hint className="mt-2">{t?.hint}</Hint>
    </Panel>
  )
}
