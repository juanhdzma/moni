import { Panel } from '@/components/panel'
import { Campo } from '@/controls/Campo'
import { Hint } from '@/controls/Hint'
import { Select } from '@/controls/Select'
import { guardarAjustes } from '@/lib/api'
import { useMeta } from '@/shell/hooks/useMeta'
import { useData } from '@/shell/providers/DataProvider'

export function Moneda() {
  const { estado, mutar, conBanner } = useData()
  const meta = useMeta()
  return (
    <Panel id="settings-currency-card" titulo="Moneda">
      <Campo id="settings-currency-select" label="Símbolo mostrado junto a los montos" className="mb-0">
        <Select
          compact
          id="settings-currency-select"
          value={estado.ajustes.moneda_simbolo}
          options={meta?.monedas ?? []}
          onChange={(symbol) => void conBanner(() => mutar((onAfectadas) => guardarAjustes({ moneda_simbolo: symbol }, onAfectadas)))}
        />
      </Campo>
      <Hint className="mt-2">Solo cambia el símbolo mostrado. Los montos se guardan y calculan igual, en COP.</Hint>
    </Panel>
  )
}
