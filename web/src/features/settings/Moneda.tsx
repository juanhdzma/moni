import { Panel } from '@/components/panel'
import { Select } from '../../controls/Select'
import { guardarAjustes } from '../../lib/api'
import { errMsg } from '../../lib/format'
import { useMeta } from '@/shell/hooks/useMeta'
import { useData } from '@/shell/providers/DataProvider'
import { HINT } from './estilos'

function Currency() {
  const { estado, reload, showBanner } = useData()
  const meta = useMeta()
  return (
    <div>
      <label className="form-label" htmlFor="settings-currency-select">Símbolo mostrado junto a los montos</label>
      <Select
        compact
        id="settings-currency-select"
        value={estado.ajustes.moneda_simbolo}
        options={meta?.monedas ?? []}
        ariaLabel="Símbolo mostrado junto a los montos"
        onChange={(symbol) => {
          guardarAjustes({ moneda_simbolo: symbol })
            .then(() => reload(['ajustes']))
            .catch((err: unknown) => showBanner(errMsg(err)))
        }}
      />
      <div className={HINT}>Solo cambia el símbolo mostrado. Los montos se guardan y calculan igual, en COP.</div>
    </div>
  )
}

export function Moneda() {
  return (
    <Panel id="settings-currency-card" titulo="Moneda">
      <div id="settings-currency">
        <Currency />
      </div>
    </Panel>
  )
}
