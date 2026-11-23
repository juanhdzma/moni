import { useState } from 'react'
import { MoneyField } from '../../../controls/MoneyField'
import { useMeta } from '@/shell/hooks/useMeta'
import { numToInput, parseMoney } from '../../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import type { InvRetiro, Inversion } from '../../../types'
import { FechaNotas, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { TipoToggle } from '../../../controls/TipoToggle'
import { InversionPanel } from './InversionPanel'
import { useGuardar } from '@/shell/hooks/useGuardar'

export function RetiroForm({ inv }: { inv: Inversion }) {
  const { estado } = useData()
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const meta = useMeta()
  const [tipo, setTipo] = useState<'total' | 'parcial'>('total')
  const [montoTotal, setMontoTotal] = useState(numToInput(inv.valor_actual))
  const [montoParcial, setMontoParcial] = useState('')
  const [saldoQueda, setSaldoQueda] = useState('')
  const [fecha, setFecha] = useState(estado.hoy)
  const [notas, setNotas] = useState('')
  const [registrar, setRegistrar] = useState(true)

  const buildBody = (): InvRetiro => {
    const comun = { fecha, notas: notas.trim(), registrar_tx: registrar }
    if (tipo === 'total') return { tipo: 'total', monto: parseMoney(montoTotal), ...comun }
    return {
      tipo: 'parcial',
      monto: parseMoney(montoParcial),
      ...(saldoQueda.trim() ? { saldo_queda: parseMoney(saldoQueda) } : {}),
      ...comun,
    }
  }

  const save = async () => {
    const body = buildBody()
    await guardar(() => apiAction(`/api/inv/${inv.id}/retiro`, body))
  }

  return (
    <>
      <InversionPanel inv={inv} />
      <TipoToggle label="Tipo de retiro" value={tipo} opciones={meta?.tipos_retiro ?? []} tonos={{ total: 'ingreso' }} onChange={setTipo} />

      <div id="retiro-total-fields" style={tipo === 'total' ? undefined : { display: 'none' }}>
        <MoneyField
          id="m-monto-total"
          label="Monto que recibís"
          value={montoTotal}
          onChange={setMontoTotal}
          hint="Pre-llenado con el valor actual — ajustá si difiere al momento del retiro."
        />
      </div>

      <div id="retiro-parcial-fields" style={tipo === 'parcial' ? undefined : { display: 'none' }}>
        <MoneyField id="m-monto-parcial" label="Monto que retirás" value={montoParcial} onChange={setMontoParcial} />
        <MoneyField
          id="m-saldo-queda"
          label="Saldo que queda en el fondo"
          value={saldoQueda}
          onChange={setSaldoQueda}
          hint="Valor total de la inversión después del retiro."
        />
      </div>

      <FechaNotas
        fechaType="date"
        fechaId="m-fecha-retiro"
        notasId="m-notas-retiro"
        fechaLabel="Fecha"
        fecha={fecha}
        onFecha={setFecha}
        notas={notas}
        onNotas={setNotas}
        notasPlaceholder="Ej. Vencimiento CDT"
      />
      <RegistrarToggle checked={registrar} onChange={setRegistrar} />
      <FormFooter saveLabel="Confirmar retiro" onSave={() => void save()} />
    </>
  )
}
