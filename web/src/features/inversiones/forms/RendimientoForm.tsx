import { useState } from 'react'
import { MoneyField } from '../../../controls/MoneyField'
import { useMeta } from '@/shell/hooks/useMeta'
import { entero, parseMoney } from '../../../lib/format'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { useData } from '@/shell/providers/DataProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvRendimiento, Inversion } from '../../../types'
import { FechaNotas, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { TipoToggle } from '../../../controls/TipoToggle'
import { useEditarInversion } from './openers'
import { useCamposMovimiento } from '@/shell/hooks/useCamposMovimiento'
import { useGuardar } from '@/shell/hooks/useGuardar'

export function RendimientoForm({ inv }: { inv: Inversion }) {
  const { cop } = useMoneda()
  const { estado } = useData()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const editar = useEditarInversion(inv)
  const meta = useMeta()
  const destinos = meta?.destinos_rendimiento ?? []
  const expected = inv.rendimiento_esperado ?? 0
  const [monto, setMonto] = useState(expected ? entero(expected) : '')
  const [eleccion, setCapitaliza] = useState<boolean | null>(null)
  const capitaliza = eleccion ?? inv.capitaliza_default
  const campos = useCamposMovimiento(estado.hoy)

  const save = async () => {
    const body: InvRendimiento = {
      monto: parseMoney(monto),
      capitaliza,
      ...campos.cuerpo(),
    }
    await guardar(() => apiAction(`/api/inv/${inv.id}/rendimiento`, body))
  }

  return (
    <>
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
        label="Monto recibido (COP)"
        value={monto}
        onChange={setMonto}
        hint={expected ? 'Pre-llenado con el rendimiento esperado del período.' : undefined}
      />
      <TipoToggle
        label="¿Dónde queda el rendimiento?"
        value={capitaliza ? 'capitaliza' : 'cuenta'}
        opciones={destinos}
        ids={{ cuenta: 'rend-cuenta', capitaliza: 'rend-capitaliza' }}
        hintId="rend-hint"
        hint={destinos.find((d) => d.value === (capitaliza ? 'capitaliza' : 'cuenta'))?.hint}
        onChange={(v) => setCapitaliza(v === 'capitaliza')}
      />
      <FechaNotas fechaType="date" fechaLabel="Fecha" fecha={campos.fecha} onFecha={campos.setFecha} notas={campos.notas} onNotas={campos.setNotas} notasPlaceholder="Ej. Intereses mes de junio" />
      {!capitaliza && (
        <div id="wrap-rend-advanced">
          <RegistrarToggle checked={campos.registrar} onChange={campos.setRegistrar} />
        </div>
      )}
      <FormFooter saveLabel="Registrar" onSave={() => void save()} onEdit={editar} editLabel="Editar inversión" />
    </>
  )
}
