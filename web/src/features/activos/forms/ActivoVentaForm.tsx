import { useState } from 'react'
import { Breakdown, BreakdownRow } from '@/controls/desglose/Breakdown'
import { MovimientoCampos } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { ModalPanel } from '@/controls/forms/ModalPanel'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { Variacion } from '@/components/Monto'
import { previewVenta, venderActivo } from '@/lib/api'
import { entero, parseMoney } from '@/lib/format'
import { useEtiquetaMoneda } from '@/shell/hooks/datos/useMonedaCodigo'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useCamposMovimiento } from '@/shell/hooks/formulario/useCamposMovimiento'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import { usePreview } from '@/shell/hooks/datos/usePreview'
import type { Activo, ActivoVenta } from '@/types'
import { FormModal } from '@/controls/forms/FormModal'

export function ActivoVentaForm({ activo: a }: { activo: Activo }) {
  const { cop } = useMoneda()
  const guardar = useGuardar()
  const conMoneda = useEtiquetaMoneda()
  const { accion } = useMutations()
  const [precioTxt, setPrecioTxt] = useState(entero(a.valor_actual))
  const campos = useCamposMovimiento()
  const precio = parseMoney(precioTxt)
  const prev = usePreview(`activo-venta:${a.id}:${precio}`, () => previewVenta(a.id, precio))

  const save = async () => {
    await guardar(async () => {
      const body: ActivoVenta = { precio, ...campos.cuerpo() }
      await accion((o) => venderActivo(a.id, body, o))
    })
  }

  return (
    <FormModal>
      <ModalPanel izquierda={{ label: 'Valor actual', valor: cop(a.valor_actual) }} derecha={{ label: 'Precio inicial', valor: cop(a.valor_inicial) }} />
      <MoneyField id="m-precio" label={conMoneda('Precio de venta')} value={precioTxt} onChange={setPrecioTxt} />
      <Breakdown id="activo-sell-preview" visible={prev !== null}>
        <BreakdownRow id="sell-gain-ini" label="Ganancia vs precio inicial">
          <Variacion valor={prev?.vs_inicial ?? 0} tono={prev?.vs_inicial_tono ?? 'neutro'} signo={prev?.vs_inicial_signo ?? ''} />
        </BreakdownRow>
        <BreakdownRow id="sell-gain-act" label="Diferencia vs último valor">
          <Variacion valor={prev?.vs_actual ?? 0} tono={prev?.vs_actual_tono ?? 'neutro'} signo={prev?.vs_actual_signo ?? ''} />
        </BreakdownRow>
      </Breakdown>
      <MovimientoCampos campos={campos} fechaLabel="Fecha de venta (hoy si se omite)" notasPlaceholder="Ej. Vendido a tercero" />
      <FormFooter saveLabel="Confirmar venta" onSave={() => void save()} />
    </FormModal>
  )
}
