import { useState } from 'react'
import { Breakdown, BreakdownRow } from '../../../controls/Breakdown'
import { MovimientoCampos } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyField } from '../../../controls/MoneyField'
import { Variacion } from '../../../controls/Variacion'
import { previewVenta } from '../../../lib/api'
import { entero, parseMoney } from '../../../lib/format'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { useCamposMovimiento } from '@/shell/hooks/useCamposMovimiento'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMutations } from '@/shell/hooks/useMutations'
import { usePreview } from '@/shell/hooks/usePreview'
import type { Activo, ActivoVenta } from '../../../types'

export function ActivoVentaForm({ activo: a }: { activo: Activo }) {
  const { cop } = useMoneda()
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const [precioTxt, setPrecioTxt] = useState(entero(a.valor_actual))
  const campos = useCamposMovimiento('')
  const precio = parseMoney(precioTxt)
  const prev = usePreview(precio > 0 ? `activo-venta:${a.id}:${precio}` : null, () => previewVenta(a.id, precio))

  const save = async () => {
    await guardar(async () => {
      const { fecha, ...resto } = campos.cuerpo()
      const body: ActivoVenta = { precio, ...resto, ...(fecha && { fecha }) }
      await apiAction(`/api/activo/${a.id}/venta`, body)
    })
  }

  return (
    <>
      <ModalPanel izquierda={{ label: 'Valor actual', valor: cop(a.valor_actual) }} derecha={{ label: 'Precio inicial', valor: cop(a.valor_inicial) }} />
      <MoneyField id="m-precio" label="Precio de venta (COP)" value={precioTxt} onChange={setPrecioTxt} />
      <Breakdown id="activo-sell-preview" visible={precio > 0 && prev !== null}>
        <BreakdownRow id="sell-gain-ini" label="Ganancia vs precio inicial">
          <Variacion valor={prev?.vs_inicial ?? 0} />
        </BreakdownRow>
        <BreakdownRow id="sell-gain-act" label="Diferencia vs último valor">
          <Variacion valor={prev?.vs_actual ?? 0} />
        </BreakdownRow>
      </Breakdown>
      <MovimientoCampos campos={campos} fechaLabel="Fecha de venta (hoy si se omite)" notasPlaceholder="Ej. Vendido a tercero" />
      <FormFooter saveLabel="Confirmar venta" onSave={() => void save()} cancelClassName="sm:ml-auto" />
    </>
  )
}
