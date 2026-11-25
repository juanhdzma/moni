import { useState } from 'react'
import { AdvancedToggle } from '@/controls/inputs/AdvancedToggle'
import { FechaField } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { NombreField } from '@/controls/inputs/NombreField'
import { entero, parseMoney, soloFecha } from '@/lib/format'
import { useGuardarEntidad } from '@/shell/hooks/acciones/useGuardarEntidad'
import { useData } from '@/shell/providers/DataProvider'
import type { Activo, ActivoIn } from '@/types'
import { FormModal } from '@/controls/forms/FormModal'

export function ActivoForm({ activo }: { activo: Activo | null }) {
  const { hoy } = useData().estado
  const { guardar, eliminar, esEdicion, etiquetaGuardar } = useGuardarEntidad('activo', { item: activo, conNuevo: (d) => ({ ...d, crear_tx: esNueva }) })
  const [nombre, setNombre] = useState(activo?.nombre ?? '')
  const [valIni, setValIni] = useState(activo ? entero(activo.valor_inicial) : '')
  const [valAct, setValAct] = useState(activo ? entero(activo.valor_actual) : '')
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
    await guardar(data)
  }

  return (
    <FormModal>
      <NombreField value={nombre} onChange={setNombre} placeholder="Ej. Apartamento Bogotá" />
      <div className="form-row-2">
        <MoneyField id="m-val-ini" label={`${esEdicion ? 'Valor inicial' : 'Precio de compra'} (COP)`} value={valIni} onChange={setValIni} />
        <MoneyField id="m-val-act" label="Valor actual (COP)" value={valAct} onChange={setValAct} placeholder="Igual al inicial si no cambia" />
      </div>
      <FechaField id="m-fecha-adq" label="Fecha de adquisición" value={fechaAdq} onChange={setFechaAdq} type="date" />
      {!esEdicion && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
      <FormFooter saveLabel={etiquetaGuardar('Agregar activo')} onSave={() => void save()} onDelete={eliminar} cancelClassName="sm:ml-auto" />
    </FormModal>
  )
}
