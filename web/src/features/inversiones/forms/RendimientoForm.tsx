import { useState } from 'react'
import { MoneyField } from '../../../controls/MoneyField'
import { useMeta } from '@/shell/hooks/useMeta'
import { cop, numToInput, parseMoney } from '../../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvRendimiento, Inversion } from '../../../types'
import { FechaNotas, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { TipoToggle } from '../../../controls/TipoToggle'
import { useEditarInversion } from './openInvForm'
import { useGuardar } from '@/shell/hooks/useGuardar'

export function RendimientoForm({ inv }: { inv: Inversion }) {
  const { estado } = useData()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const editar = useEditarInversion(inv)
  const meta = useMeta()
  const destinos = meta?.destinos_rendimiento ?? []
  const expected = inv.rendimiento_esperado ?? 0
  const [monto, setMonto] = useState(expected ? numToInput(expected) : '')
  const [eleccion, setCapitaliza] = useState<boolean | null>(null)
  const capitaliza = eleccion ?? inv.capitaliza_default
  const [fecha, setFecha] = useState(estado.hoy)
  const [notas, setNotas] = useState('')
  const [registrar, setRegistrar] = useState(true)

  const save = async () => {
    const body: InvRendimiento = {
      monto: parseMoney(monto),
      fecha,
      notas: notas.trim(),
      capitaliza,
      registrar_tx: registrar,
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
        tonos={{ cuenta: 'ingreso' }}
        ids={{ cuenta: 'rend-cuenta', capitaliza: 'rend-capitaliza' }}
        hintId="rend-hint"
        hint={destinos.find((d) => d.value === (capitaliza ? 'capitaliza' : 'cuenta'))?.hint}
        onChange={(v) => setCapitaliza(v === 'capitaliza')}
      />
      <FechaNotas fechaType="date" fechaLabel="Fecha" fecha={fecha} onFecha={setFecha} notas={notas} onNotas={setNotas} notasPlaceholder="Ej. Intereses mes de junio" />
      {!capitaliza && (
        <div id="wrap-rend-advanced">
          <RegistrarToggle checked={registrar} onChange={setRegistrar} />
        </div>
      )}
      <FormFooter saveLabel="Registrar" onSave={() => void save()} onEdit={editar} editLabel="Editar inversión" />
    </>
  )
}
