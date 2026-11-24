import { useState } from 'react'
import { FechaNotas } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyField } from '../../../controls/MoneyField'
import { NombreField } from '../../../controls/NombreField'
import { Select } from '../../../controls/Select'
import { TipoToggle } from '../../../controls/TipoToggle'
import { entero, parseMoney, soloFecha } from '../../../lib/format'
import { useGuardarEntidad } from '@/shell/hooks/useGuardarEntidad'
import { useMeta } from '@/shell/hooks/useMeta'
import type { Recurrente, TipoRec } from '../../../types'

export function RecurrenteForm({ item }: { item: Recurrente | null }) {
  const meta = useMeta()
  const { guardar, eliminar, etiquetaGuardar } = useGuardarEntidad('rec', { item })
  const [nombre, setNombre] = useState(item?.nombre || '')
  const [tipo, setTipo] = useState<TipoRec>(item?.tipo ?? 'gasto')
  const [monto, setMonto] = useState(item ? entero(item.monto) : '')
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
    await guardar(data)
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
        <MoneyField id="m-monto" label="Monto (COP)" value={monto} onChange={setMonto} />
        <div className="form-group">
          <label className="form-label" htmlFor="m-frecuencia">Frecuencia</label>
          <Select id="m-frecuencia" value={frecuencia} onChange={setFrecuencia} options={meta?.frecuencias ?? []} />
        </div>
      </div>
      <FechaNotas fechaType="date" fechaLabel="Fecha inicio (opcional)" fecha={fecha} onFecha={setFecha} notas={notas} onNotas={setNotas} notasPlaceholder="" />
      <FormFooter saveLabel={etiquetaGuardar()} onSave={() => void save()} onDelete={eliminar} cancelClassName="ml-auto" />
    </>
  )
}
