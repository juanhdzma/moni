import { useState } from 'react'
import { Breakdown, BreakdownRow } from '../../../controls/Breakdown'
import { FechaNotas, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyField } from '../../../controls/MoneyField'
import { previewAdelanto } from '../../../lib/api'
import { parseMoney } from '../../../lib/format'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { useCamposMovimiento } from '@/shell/hooks/useCamposMovimiento'
import { useMutations } from '@/shell/hooks/useMutations'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from '@/shell/hooks/usePreview'
import type { Deuda, DeudaAdelanto } from '../../../types'

export function AdelantoForm({ d }: { d: Deuda }) {
  const { cop } = useMoneda()
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const tieneCupo = d.tiene_cupo
  const [monto, setMonto] = useState('')
  const [disponible, setDisponible] = useState('')
  const [saldoNuevoIn, setSaldoNuevoIn] = useState('')
  const campos = useCamposMovimiento('')

  const montoV = parseMoney(monto)
  const saldoEscrito = tieneCupo ? disponible : saldoNuevoIn
  const saldoBody = (): Pick<DeudaAdelanto, 'nuevo_saldo' | 'disponible_nuevo'> =>
    tieneCupo ? { disponible_nuevo: parseMoney(disponible) } : { nuevo_saldo: parseMoney(saldoNuevoIn) }
  const showBreakdown = Boolean(montoV) && saldoEscrito.trim() !== ''
  const preview = usePreview(showBreakdown ? `${montoV}:${saldoEscrito}` : null, () =>
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
      await apiAction(`/api/deuda/${d.id}/adelanto`, body)
    })
  }

  return (
    <>
      <ModalPanel
        izquierda={{ label: 'Debes', valor: cop(d.saldo_actual), clase: 'text-deudas' }}
        derecha={d.frases.disponible_texto ? { label: 'Disponible', valor: d.frases.disponible_texto } : undefined}
      />
      <MoneyField id="m-monto" label="Monto del adelanto (COP)" value={monto} onChange={setMonto} hint="La plata que vas a recibir en tu cuenta." />
      {tieneCupo ? (
        <MoneyField
          id="m-disponible-nuevo"
          label="Cupo disponible después del adelanto (COP)"
          value={disponible}
          onChange={setDisponible}
          placeholder="Lo que te muestra el banco como disponible"
        />
      ) : (
        <MoneyField
          id="m-saldo-nuevo"
          label="Saldo en la tarjeta después del adelanto (COP)"
          value={saldoNuevoIn}
          onChange={setSaldoNuevoIn}
          placeholder="Lo que muestra tu banco después"
        />
      )}
      <Breakdown id="adelanto-breakdown" visible={showBreakdown}>
        <BreakdownRow id="adelanto-deuda" label="Deuda total después">
          <span className="text-deudas">{preview ? cop(preview.nuevo_saldo) : '—'}</span>
        </BreakdownRow>
        {comision > 0 && (
          <BreakdownRow id="adelanto-comision" label="Comisión / cargos">
            <span className="text-deudas">{cop(comision)}</span>
          </BreakdownRow>
        )}
      </Breakdown>
      <FechaNotas
        fechaLabel="Fecha (ahora si se omite)"
        fecha={campos.fecha}
        onFecha={campos.setFecha}
        notas={campos.notas}
        onNotas={campos.setNotas}
        notasPlaceholder="Ej. Adelanto cajero"
      />
      <RegistrarToggle checked={campos.registrar} onChange={campos.setRegistrar} label="Registrar como ingreso" />
      <FormFooter saveLabel="Pedir adelanto" onSave={() => void save()} />
    </>
  )
}
