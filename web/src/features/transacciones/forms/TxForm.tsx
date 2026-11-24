import { useState } from 'react'
import { Cargando } from '@/components/Cargando'
import { FormFooter } from '../../../controls/FormFooter'
import { Select } from '../../../controls/Select'
import { TipoToggle } from '../../../controls/TipoToggle'
import { numToInput } from '../../../lib/format'
import { useConfirmDelete } from '@/shell/hooks/useConfirmDelete'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMeta } from '@/shell/hooks/useMeta'
import { useMutations } from '@/shell/hooks/useMutations'
import type { OpcionesTx, Transaccion } from '../../../types'
import { CamposTx, cuerpoTx, useOpcionesTx, type ValoresTx } from './CamposTx'

export function TxForm({ tx }: { tx: Transaccion | null }) {
  const opciones = useOpcionesTx(tx?.id)
  if (!opciones) return <Cargando />
  return <TxFormCampos tx={tx} opciones={opciones} />
}

function TxFormCampos({ tx, opciones }: { tx: Transaccion | null; opciones: OpcionesTx }) {
  const guardar = useGuardar()
  const meta = useMeta()
  const { crudOp } = useMutations()
  const eliminar = useConfirmDelete('tx', tx, '¿Eliminar este movimiento?')
  const isEdit = tx !== null
  const { tarjetas, inicial } = opciones

  const [tipo, setTipo] = useState(inicial.tipo)
  const [tarjeta, setTarjeta] = useState(inicial.tarjeta_id != null ? String(inicial.tarjeta_id) : '')
  const [valores, setValores] = useState<ValoresTx>({
    categoria: inicial.categoria,
    descripcion: tx?.descripcion || '',
    monto: tx ? numToInput(tx.monto) : '',
    fecha: inicial.fecha,
    notas: tx?.notas || '',
  })

  const cambiarTipo = (t: 'ingreso' | 'gasto') => {
    setTipo(t)
    setValores((v) => ({ ...v, categoria: opciones.categoria_default[t] }))
  }

  const save = async () => {
    const data = cuerpoTx(tipo, valores, tarjeta ? Number(tarjeta) : null)
    await guardar(async () => {
      if (tx) await crudOp('tx', 'update', { ...data, id: tx.id })
      else await crudOp('tx', 'add', data)
    })
  }

  return (
    <>
      <TipoToggle value={tipo} opciones={meta?.tipos_manuales ?? []} onChange={cambiarTipo} />
      <CamposTx tipo={tipo} categorias={opciones.categorias[tipo]} valores={valores} onCambio={(p) => setValores((v) => ({ ...v, ...p }))}>
        {tipo === 'gasto' && (
          <div className="form-group" id="wrap-tarjeta">
            <label className="form-label" htmlFor="m-tarjeta">Pagado con</label>
            <Select
              id="m-tarjeta"
              value={tarjeta}
              onChange={setTarjeta}
              ariaLabel="Pagado con"
              options={[{ value: '', label: 'Efectivo / Débito' }, ...tarjetas.map((d) => ({ value: String(d.id), label: d.nombre }))]}
            />
          </div>
        )}
      </CamposTx>
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar'} onSave={() => void save()} onDelete={eliminar} cancelClassName="ml-auto" buttonType="button" />
    </>
  )
}
