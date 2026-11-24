import { Panel } from '@/components/panel'
import { Select } from '../../controls/Select'
import { guardarAjustes } from '../../lib/api'
import { useMeta } from '@/shell/hooks/useMeta'
import { useData } from '@/shell/providers/DataProvider'
import { Hint } from '../../controls/Hint'

export function Moneda() {
  const { estado, aplicarEstado, conBanner } = useData()
  const meta = useMeta()
  return (
    <Panel id="settings-currency-card" titulo="Moneda">
      <label className="form-label" htmlFor="settings-currency-select">Símbolo mostrado junto a los montos</label>
      <Select
        compact
        id="settings-currency-select"
        value={estado.ajustes.moneda_simbolo}
        options={meta?.monedas ?? []}
        ariaLabel="Símbolo mostrado junto a los montos"
        onChange={(symbol) =>
          void conBanner(async () => aplicarEstado({ ajustes: await guardarAjustes({ moneda_simbolo: symbol }) }, ['ajustes']))
        }
      />
      <Hint className="mt-2">Solo cambia el símbolo mostrado. Los montos se guardan y calculan igual, en COP.</Hint>
    </Panel>
  )
}

