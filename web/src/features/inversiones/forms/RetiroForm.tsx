import { useState } from 'react'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { entero, parseMoney } from '@/lib/format'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import type { InvRetiro, Inversion } from '@/types'
import { FechaNotas, RegistrarToggle } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { TipoToggle } from '@/controls/inputs/TipoToggle'
import { InversionPanel } from './InversionPanel'
import { useCamposMovimiento } from '@/shell/hooks/formulario/useCamposMovimiento'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { FormModal } from '@/controls/forms/FormModal'

const TIPO_PARCIAL = 'parcial'

export function RetiroForm({ inv }: { inv: Inversion }) {
  const { apiAction } = useMutations()
  const guardar = useGuardar()
  const meta = useMeta()
  const [tipoElegido, setTipo] = useState<string | null>(null)
  const tipo = tipoElegido ?? meta?.defaults.tipo_retiro ?? ''
  const parcial = tipo === TIPO_PARCIAL
  const [montoTotal, setMontoTotal] = useState(entero(inv.valor_actual))
  const [montoParcial, setMontoParcial] = useState('')
  const [saldoQueda, setSaldoQueda] = useState('')
  const campos = useCamposMovimiento()

  const buildBody = (): InvRetiro => {
    const comun = { tipo: tipo as InvRetiro['tipo'], ...campos.cuerpo() }
    if (!parcial) return { monto: parseMoney(montoTotal), ...comun }
    return {
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
    <FormModal>
      <InversionPanel inv={inv} />
      <TipoToggle label="Tipo de retiro" value={tipo} opciones={meta?.tipos_retiro ?? []} onChange={setTipo} />

      {!parcial && (
        <div id="retiro-total-fields">
          <MoneyField
            id="m-monto-total"
            label="Monto que recibís"
            value={montoTotal}
            onChange={setMontoTotal}
            hint="Pre-llenado con el valor actual — ajustá si difiere al momento del retiro."
          />
        </div>
      )}

      {parcial && (
        <div id="retiro-parcial-fields">
          <MoneyField id="m-monto-parcial" label="Monto que retirás" value={montoParcial} onChange={setMontoParcial} />
          <MoneyField
            id="m-saldo-queda"
            label="Saldo que queda en el fondo"
            value={saldoQueda}
            onChange={setSaldoQueda}
            hint="Valor total de la inversión después del retiro."
          />
        </div>
      )}

      <FechaNotas
        fechaType="date"
        fechaId="m-fecha-retiro"
        notasId="m-notas-retiro"
        fechaLabel="Fecha (hoy si se omite)"
        fecha={campos.fecha}
        onFecha={campos.setFecha}
        notas={campos.notas}
        onNotas={campos.setNotas}
        notasPlaceholder="Ej. Vencimiento CDT"
      />
      <RegistrarToggle checked={campos.registrar} onChange={campos.setRegistrar} />
      <FormFooter saveLabel="Confirmar retiro" onSave={() => void save()} />
    </FormModal>
  )
}
