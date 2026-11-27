import { useState } from 'react'
import { Breakdown, BreakdownRow } from '@/controls/desglose/Breakdown'
import { FechaNotas, RegistrarToggle } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { ModalPanel } from '@/controls/forms/ModalPanel'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { adelantarDeuda, previewAdelanto } from '@/lib/api'
import { parseMoney } from '@/lib/format'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useEtiquetaMoneda } from '@/shell/hooks/datos/useMonedaCodigo'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useCamposMovimiento } from '@/shell/hooks/formulario/useCamposMovimiento'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { usePreview } from '@/shell/hooks/datos/usePreview'
import type { Deuda, DeudaAdelanto } from '@/types'
import { FormModal } from '@/controls/forms/FormModal'

export function AdelantoForm({ d }: { d: Deuda }) {
  const { cop } = useMoneda()
  const guardar = useGuardar()
  const t = useMeta()?.textos.adelanto
  const conMoneda = useEtiquetaMoneda()
  const { accion } = useMutations()
  const tieneCupo = d.tiene_cupo
  const [monto, setMonto] = useState('')
  const [disponible, setDisponible] = useState('')
  const [saldoNuevoIn, setSaldoNuevoIn] = useState('')
  const campos = useCamposMovimiento()

  const montoV = parseMoney(monto)
  const saldoEscrito = tieneCupo ? disponible : saldoNuevoIn
  const saldoBody = (): Pick<DeudaAdelanto, 'nuevo_saldo' | 'disponible_nuevo'> =>
    tieneCupo ? { disponible_nuevo: parseMoney(disponible) } : { nuevo_saldo: parseMoney(saldoNuevoIn) }
  const preview = usePreview(saldoEscrito.trim() ? `${montoV}:${saldoEscrito}` : null, () =>
    previewAdelanto(d.id, { monto: montoV, ...saldoBody() }),
  )
  const comision = preview?.comision ?? 0

  const save = async () => {
    await guardar(async () => {
      const body: Pick<DeudaAdelanto, 'monto'> & Partial<DeudaAdelanto> = {
        monto: montoV,
        ...(saldoEscrito.trim() && saldoBody()),
        ...campos.cuerpo(),
      }
      await accion((o) => adelantarDeuda(d.id, body as DeudaAdelanto, o))
    })
  }

  return (
    <FormModal>
      <ModalPanel
        izquierda={{ label: t?.label_debes ?? '', valor: cop(d.saldo_actual), clase: 'text-deudas' }}
        derecha={d.frases.disponible_texto ? { label: t?.label_disponible ?? '', valor: d.frases.disponible_texto } : undefined}
      />
      <MoneyField id="m-monto" label={conMoneda(t?.label_monto)} value={monto} onChange={setMonto} hint={t?.hint_monto} />
      {tieneCupo ? (
        <MoneyField
          id="m-disponible-nuevo"
          label={conMoneda(t?.label_disponible_nuevo)}
          value={disponible}
          onChange={setDisponible}
          placeholder={t?.placeholder_disponible_nuevo}
        />
      ) : (
        <MoneyField
          id="m-saldo-nuevo"
          label={conMoneda(t?.label_saldo_nuevo)}
          value={saldoNuevoIn}
          onChange={setSaldoNuevoIn}
          placeholder={t?.placeholder_saldo_nuevo}
        />
      )}
      <Breakdown id="adelanto-breakdown" visible={preview !== null}>
        <BreakdownRow id="adelanto-deuda" label={t?.label_deuda_total ?? ''}>
          <span className="text-deudas">{preview ? cop(preview.nuevo_saldo) : '—'}</span>
        </BreakdownRow>
        {comision > 0 && (
          <BreakdownRow id="adelanto-comision" label={t?.label_comision ?? ''}>
            <span className="text-deudas">{cop(comision)}</span>
          </BreakdownRow>
        )}
      </Breakdown>
      <FechaNotas
        fechaLabel={t?.label_fecha ?? ''}
        fecha={campos.fecha}
        onFecha={campos.setFecha}
        notas={campos.notas}
        onNotas={campos.setNotas}
        notasPlaceholder={t?.placeholder_notas ?? ''}
      />
      <RegistrarToggle checked={campos.registrar} onChange={campos.setRegistrar} label={t?.label_registrar} />
      <FormFooter saveLabel={t?.guardar ?? ''} onSave={() => void save()} />
    </FormModal>
  )
}
