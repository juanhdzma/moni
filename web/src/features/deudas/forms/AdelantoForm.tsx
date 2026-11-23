import { useState } from 'react'
import { Breakdown, BreakdownRow } from '../../../controls/Breakdown'
import { FechaNotas, RegistrarToggle } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { ModalPanel } from '../../../controls/ModalPanel'
import { MoneyField } from '../../../controls/MoneyField'
import { previewAdelanto } from '../../../lib/api'
import { cop, parseMoney } from '../../../lib/format'
import { useModal } from '@/shell/providers/ModalProvider'
import { useMutations } from '@/shell/hooks/useMutations'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { usePreview } from '@/shell/hooks/usePreview'
import type { Deuda, DeudaAdelanto } from '../../../types'

export function AdelantoForm({ d }: { d: Deuda }) {
  const { setModalStatus } = useModal()
  const guardar = useGuardar()
  const { apiAction } = useMutations()
  const tieneCupo = d.cupo > 0
  const [monto, setMonto] = useState('')
  const [disponible, setDisponible] = useState('')
  const [saldoNuevoIn, setSaldoNuevoIn] = useState('')
  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')
  const [registrarTx, setRegistrarTx] = useState(true)

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
    if (!saldoEscrito.trim()) {
      setModalStatus('err', tieneCupo ? 'Ingresá el cupo disponible después del adelanto' : 'Ingresá el saldo después del adelanto')
      return
    }
    await guardar(async () => {
      const body: DeudaAdelanto = {
        monto: montoV,
        ...saldoBody(),
        fecha: fecha || undefined,
        notas: notas.trim(),
        registrar_tx: registrarTx,
      }
      await apiAction(`/api/deuda/${d.id}/adelanto`, body)
    })
  }

  return (
    <>
      <ModalPanel
        izquierda={{ label: 'Debes', valor: cop(d.saldo_actual), clase: 'text-deudas' }}
        derecha={tieneCupo ? { label: 'Disponible', valor: cop(d.disponible) } : undefined}
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
        fecha={fecha}
        onFecha={setFecha}
        notas={notas}
        onNotas={setNotas}
        notasPlaceholder="Ej. Adelanto cajero"
      />
      <RegistrarToggle checked={registrarTx} onChange={setRegistrarTx} label="Registrar como ingreso" />
      <FormFooter saveLabel="Pedir adelanto" onSave={() => void save()} />
    </>
  )
}
