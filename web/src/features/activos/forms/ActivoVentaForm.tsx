import { useState } from 'react'
import { Breakdown, BreakdownRow } from '../../../controls/Breakdown'
import { FechaNotas, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyInput } from '../../../controls/MoneyInput'
import { Variacion } from '../../../controls/Variacion'
import { previewVenta } from '../../../lib/api'
import { cop, numToInput, parseMoney } from '../../../lib/format'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMutations } from '@/shell/hooks/useMutations'
import { usePreview } from '@/shell/hooks/usePreview'
import type { Activo, ActivoVenta } from '../../../types'

export function ActivoVentaForm({ activo: a }: { activo: Activo }) {
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const [precioTxt, setPrecioTxt] = useState(numToInput(a.valor_actual))
  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')
  const [registrarTx, setRegistrarTx] = useState(true)
  const precio = parseMoney(precioTxt)
  const prev = usePreview(precio > 0 ? `activo-venta:${a.id}:${precio}` : null, () => previewVenta(a.id, precio))

  const save = async () => {
    await guardar(async () => {
      const body: ActivoVenta = { precio, notas: notas.trim(), registrar_tx: registrarTx, ...(fecha && { fecha }) }
      await apiAction(`/api/activo/${a.id}/venta`, body)
    })
  }

  return (
    <>
      <ModalPanel izquierda={{ label: 'Valor actual', valor: cop(a.valor_actual) }} derecha={{ label: 'Precio inicial', valor: cop(a.valor_inicial) }} />
      <div className="form-group">
        <label className="form-label" htmlFor="m-precio">Precio de venta (COP)</label>
        <MoneyInput id="m-precio" value={precioTxt} onChange={setPrecioTxt} />
      </div>
      <Breakdown id="activo-sell-preview" visible={precio > 0 && prev !== null}>
        <BreakdownRow id="sell-gain-ini" label="Ganancia vs precio inicial">
          <Variacion valor={prev?.vs_inicial ?? 0} />
        </BreakdownRow>
        <BreakdownRow id="sell-gain-act" label="Diferencia vs último valor">
          <Variacion valor={prev?.vs_actual ?? 0} />
        </BreakdownRow>
      </Breakdown>
      <FechaNotas
        fechaLabel="Fecha de venta (hoy si se omite)"
        fecha={fecha}
        onFecha={setFecha}
        notas={notas}
        onNotas={setNotas}
        notasPlaceholder="Ej. Vendido a tercero"
      />
      <RegistrarToggle checked={registrarTx} onChange={setRegistrarTx} />
      <FormFooter saveLabel="Confirmar venta" onSave={() => void save()} cancelClassName="sm:ml-auto" />
    </>
  )
}
