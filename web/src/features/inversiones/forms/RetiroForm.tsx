import { useState } from 'react'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { MovimientoCampos } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { FormModal } from '@/controls/forms/FormModal'
import { TipoToggle } from '@/controls/inputs/TipoToggle'
import { entero, parseMoney } from '@/lib/format'
import { retirarInversion } from '@/lib/api'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import { useCamposMovimiento } from '@/shell/hooks/formulario/useCamposMovimiento'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import type { InvRetiro, Inversion } from '@/types'
import { InversionPanel } from './InversionPanel'

export function RetiroForm({ inv }: { inv: Inversion }) {
  const { accion } = useMutations()
  const guardar = useGuardar()
  const meta = useMeta()
  const textos = meta?.textos
  const [tipoElegido, setTipo] = useState<string | null>(null)
  const tipo = tipoElegido ?? meta?.defaults.tipo_retiro ?? ''
  const opcion = meta?.tipos_retiro.find((t) => t.value === tipo)
  const pideSaldoQueda = opcion?.pide_saldo_queda ?? false
  const [monto, setMonto] = useState<string | null>(null)
  const [saldoQueda, setSaldoQueda] = useState('')
  const campos = useCamposMovimiento()
  const montoMostrado = monto ?? (opcion?.prellena_monto ? entero(inv.monto_retiro_total) : '')

  const body = (): InvRetiro => ({
    tipo: tipo as InvRetiro['tipo'],
    monto: parseMoney(montoMostrado),
    ...(pideSaldoQueda && saldoQueda.trim() ? { saldo_queda: parseMoney(saldoQueda) } : {}),
    ...campos.cuerpo(),
  })

  return (
    <FormModal>
      <InversionPanel inv={inv} />
      <TipoToggle label={textos?.retiro.label_tipo} value={tipo} opciones={meta?.tipos_retiro ?? []} onChange={(t) => { setTipo(t); setMonto(null) }} />
      <div id={pideSaldoQueda ? 'retiro-parcial-fields' : 'retiro-total-fields'}>
        <MoneyField
          id={pideSaldoQueda ? 'm-monto-parcial' : 'm-monto-total'}
          label={(pideSaldoQueda ? textos?.retiro.label_monto_parcial : textos?.retiro.label_monto_total) ?? ''}
          value={montoMostrado}
          onChange={setMonto}
          hint={pideSaldoQueda ? undefined : textos?.retiro.hint_monto_total}
        />
        {pideSaldoQueda && (
          <MoneyField id="m-saldo-queda" label={textos?.retiro.label_saldo_queda ?? ''} value={saldoQueda} onChange={setSaldoQueda} hint={textos?.retiro.hint_saldo_queda} />
        )}
      </div>
      <MovimientoCampos campos={campos} fechaType="date" fechaId="m-fecha-retiro" notasId="m-notas-retiro" fechaLabel={textos?.retiro.label_fecha ?? ''} notasPlaceholder={textos?.retiro.placeholder_notas ?? ''} />
      <FormFooter saveLabel={textos?.retiro.guardar ?? ''} onSave={() => void guardar(() => accion((o) => retirarInversion(inv.id, body(), o)))} />
    </FormModal>
  )
}
