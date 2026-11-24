import { useState } from 'react'
import { FechaNotas } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyInput } from '../../../controls/MoneyInput'
import { NombreField } from '../../../controls/NombreField'
import { Select } from '../../../controls/Select'
import { TipoToggle } from '../../../controls/TipoToggle'
import { numToInput, parseMoney, soloFecha } from '../../../lib/format'
import { useConfirmDelete } from '@/shell/hooks/useConfirmDelete'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMeta } from '@/shell/hooks/useMeta'
import { useMutations } from '@/shell/hooks/useMutations'
import type { Recurrente, TipoRec } from '../../../types'

export function RecurrenteForm({ item }: { item: Recurrente | null }) {
  const isEdit = item !== null
  const meta = useMeta()
  const guardar = useGuardar()
  const { crudOp } = useMutations()
  const eliminar = useConfirmDelete('rec', item, `¿Eliminar "${item?.nombre}"?`)
  const [nombre, setNombre] = useState(item?.nombre || '')
  const [tipo, setTipo] = useState<TipoRec>(item?.tipo === 'ingreso' ? 'ingreso' : 'gasto')
  const [monto, setMonto] = useState(item ? numToInput(item.monto) : '')
  const [frecuencia, setFrecuencia] = useState<string>(item?.frecuencia || meta?.defaults.frecuencia_recurrente || '')
  const [fecha, setFecha] = useState(soloFecha(item?.fecha_inicio))
  const [notas, setNotas] = useState(item?.notas || '')

  const save = async () => {
    const data = {
      nombre: nombre.trim(),
      tipo,
      monto: parseMoney(monto),
      frecuencia,
      fecha_inicio: fecha,
      notas: notas.trim(),
    }
    await guardar(async () => {
      if (item) await crudOp('rec', 'update', { ...data, id: item.id })
      else await crudOp('rec', 'add', data)
    })
  }

  return (
    <>
      <NombreField value={nombre} onChange={setNombre} placeholder="Ej. Netflix" />
      <TipoToggle
        value={tipo}
        opciones={meta?.tipos_manuales ?? []}
        idPrefix="rt"
        onChange={setTipo}
      />
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="m-monto">Monto (COP)</label>
          <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="m-frecuencia">Frecuencia</label>
          <Select id="m-frecuencia" value={frecuencia} onChange={setFrecuencia} options={meta?.frecuencias ?? []} />
        </div>
      </div>
      <FechaNotas fechaType="date" fechaLabel="Fecha inicio (opcional)" fecha={fecha} onFecha={setFecha} notas={notas} onNotas={setNotas} notasPlaceholder="" />
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar'} onSave={() => void save()} onDelete={eliminar} cancelClassName="ml-auto" />
    </>
  )
}
