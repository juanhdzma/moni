import { useState } from 'react'
import { MoneyInput } from '../../../controls/MoneyInput'
import { cop, numToInput, parseMoney, pct } from '../../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useVista } from '@/shell/hooks/useVista'
import { cargarRendimientoDefaults } from '../../../lib/api/inversiones'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvRendimiento, Inversion } from '../../../types'
import { FechaNotas, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { TipoToggle } from '../../../controls/TipoToggle'
import { hintClass } from './styles'
import { useEditarInversion } from './openInvForm'
import { useGuardar } from '@/shell/hooks/useGuardar'

const DESTINOS = [
  { value: 'cuenta', label: 'Me lo pagan' },
  { value: 'capitaliza', label: 'Capitaliza' },
]

const REND_HINT = {
  capitaliza: 'Sube el valor de la inversión. No entra plata a tu cartera.',
  cuenta: 'Entra como ingreso a tu cartera. El valor de la inversión no cambia.',
}

export function RendimientoForm({ inv }: { inv: Inversion }) {
  const { estado } = useData()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const editar = useEditarInversion(inv)
  const mv = inv.tasa_mv ?? 0
  const expected = inv.rendimiento_esperado ?? 0
  const [monto, setMonto] = useState(expected ? numToInput(expected) : '')
  const { data: defaults } = useVista(`inv-rend-defaults:${inv.id}`, () => cargarRendimientoDefaults(inv.id))
  const [eleccion, setCapitaliza] = useState<boolean | null>(null)
  const capitaliza = eleccion ?? defaults?.capitaliza_default ?? false
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
          inv.tasa_ea
            ? {
                label: 'Mensual esperado',
                valor: cop(expected),
                clase: 'text-inversiones-text',
                detalle: `${pct(inv.tasa_ea, 2)}% EA · ${pct(mv, 4)}% MV`,
              }
            : undefined
        }
      />
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">
          Monto recibido (COP)
        </label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        {expected ? <div className={hintClass}>Pre-llenado con el rendimiento esperado del período.</div> : null}
      </div>
      <TipoToggle
        label="¿Dónde queda el rendimiento?"
        value={capitaliza ? 'capitaliza' : 'cuenta'}
        opciones={DESTINOS}
        tonos={{ cuenta: 'ingreso' }}
        ids={{ cuenta: 'rend-cuenta', capitaliza: 'rend-capitaliza' }}
        hintId="rend-hint"
        hint={capitaliza ? REND_HINT.capitaliza : REND_HINT.cuenta}
        onChange={(v) => setCapitaliza(v === 'capitaliza')}
      />
      <FechaNotas fechaType="date" fechaLabel="Fecha" fecha={fecha} onFecha={setFecha} notas={notas} onNotas={setNotas} notasPlaceholder="Ej. Intereses mes de junio" />
      <div id="wrap-rend-advanced" style={capitaliza ? { display: 'none' } : undefined}>
        <RegistrarToggle checked={registrar} onChange={setRegistrar} />
      </div>
      <FormFooter saveLabel="Registrar" onSave={() => void save()} onEdit={editar} editLabel="Editar inversión" />
    </>
  )
}
