import { useState } from 'react'
import { registrarRendimiento } from '@/lib/api'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { entero, parseMoney } from '@/lib/format'
import { useEtiquetaMoneda } from '@/shell/hooks/datos/useMonedaCodigo'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import type { InvRendimiento, Inversion } from '@/types'
import { MovimientoCampos } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { ModalPanel } from '@/controls/forms/ModalPanel'
import { TipoToggle } from '@/controls/inputs/TipoToggle'
import { useEditarInversion } from './openers'
import { useCamposMovimiento } from '@/shell/hooks/formulario/useCamposMovimiento'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { FormModal } from '@/controls/forms/FormModal'

export function RendimientoForm({ inv }: { inv: Inversion }) {
  const { cop } = useMoneda()
  const { accion } = useMutations()
  const guardar = useGuardar()
  const conMoneda = useEtiquetaMoneda()
  const editar = useEditarInversion(inv)
  const meta = useMeta()
  const destinos = meta?.destinos_rendimiento ?? []
  const expected = inv.rendimiento_esperado ?? 0
  const [monto, setMonto] = useState(expected ? entero(expected) : '')
  const [eleccion, setEleccion] = useState<string | null>(null)
  const destino = destinos.find((d) => (eleccion === null ? d.capitaliza === inv.capitaliza_default : d.value === eleccion))
  const capitaliza = destino?.capitaliza ?? inv.capitaliza_default
  const campos = useCamposMovimiento()

  const save = async () => {
    const body: InvRendimiento = {
      monto: parseMoney(monto),
      capitaliza,
      ...campos.cuerpo(),
    }
    await guardar(() => accion((o) => registrarRendimiento(inv.id, body, o)))
  }

  return (
    <FormModal>
      <ModalPanel
        izquierda={{ label: 'Valor actual', valor: cop(inv.valor_actual), clase: 'text-inversiones-text' }}
        derecha={
          inv.texto_tasa
            ? {
                label: 'Mensual esperado',
                valor: cop(expected),
                clase: 'text-inversiones-text',
                detalle: inv.texto_tasa,
              }
            : undefined
        }
      />
      <MoneyField
        id="m-monto"
        label={conMoneda('Monto recibido')}
        value={monto}
        onChange={setMonto}
        hint={expected ? 'Pre-llenado con el rendimiento esperado del período.' : undefined}
      />
      <TipoToggle
        label="¿Dónde queda el rendimiento?"
        value={destino?.value ?? ''}
        opciones={destinos}
        ids={{ cuenta: 'rend-cuenta', capitaliza: 'rend-capitaliza' }}
        hintId="rend-hint"
        hint={destino?.hint}
        onChange={setEleccion}
      />
      <MovimientoCampos campos={campos} fechaType="date" fechaLabel="Fecha (hoy si se omite)" notasPlaceholder="Ej. Intereses mes de junio" conRegistrar={!capitaliza} />
      <FormFooter saveLabel="Registrar" onSave={() => void save()} onEdit={editar} editLabel="Editar inversión" />
    </FormModal>
  )
}
