import { useState } from 'react'
import { AdvancedToggle } from '../../../controls/AdvancedToggle'
import { FechaField } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyField } from '../../../controls/MoneyField'
import { NombreField } from '../../../controls/NombreField'
import { numToInput, parseMoney, soloFecha } from '../../../lib/format'
import { useConfirmDelete } from '@/shell/hooks/useConfirmDelete'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMutations } from '@/shell/hooks/useMutations'
import { useData } from '@/shell/providers/DataProvider'
import type { Activo, ActivoIn } from '../../../types'

export function ActivoForm({ activo }: { activo: Activo | null }) {
  const isEdit = activo !== null
  const guardar = useGuardar()
  const { hoy } = useData().estado
  const { crudOp } = useMutations()
  const eliminar = useConfirmDelete('activo', activo, `¿Eliminar "${activo?.nombre}"?`)
  const [nombre, setNombre] = useState(activo?.nombre ?? '')
  const [valIni, setValIni] = useState(activo ? numToInput(activo.valor_inicial) : '')
  const [valAct, setValAct] = useState(activo ? numToInput(activo.valor_actual) : '')
  const [fechaAdq, setFechaAdq] = useState(soloFecha(activo?.fecha_adquisicion) || hoy)
  const [esNueva, setEsNueva] = useState(true)

  const save = async () => {
    const valorActual = parseMoney(valAct)
    const data: ActivoIn = {
      nombre: nombre.trim(),
      valor_inicial: parseMoney(valIni),
      fecha_adquisicion: fechaAdq,
      ...(valorActual > 0 && { valor_actual: valorActual }),
    }
    await guardar(async () => {
      if (activo) await crudOp('activo', 'update', { ...data, id: activo.id })
      else await crudOp('activo', 'add', { ...data, crear_tx: esNueva })
    })
  }

  return (
    <>
      <NombreField value={nombre} onChange={setNombre} placeholder="Ej. Apartamento Bogotá" />
      <div className="form-row-2">
        <MoneyField id="m-val-ini" label={`${isEdit ? 'Valor inicial' : 'Precio de compra'} (COP)`} value={valIni} onChange={setValIni} />
        <MoneyField id="m-val-act" label="Valor actual (COP)" value={valAct} onChange={setValAct} placeholder="Igual al inicial si no cambia" />
      </div>
      <FechaField id="m-fecha-adq" label="Fecha de adquisición" value={fechaAdq} onChange={setFechaAdq} type="date" />
      {!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar activo'} onSave={() => void save()} onDelete={eliminar} cancelClassName="sm:ml-auto" />
    </>
  )
}
