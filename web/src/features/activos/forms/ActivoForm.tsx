import { useState } from 'react'
import { CrearTxToggle } from '@/controls/inputs/OpcionesRegistro'
import { FechaField } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { NombreField } from '@/controls/inputs/NombreField'
import { entero, parseMoney, soloFecha } from '@/lib/format'
import { useGuardarEntidad } from '@/shell/hooks/acciones/useGuardarEntidad'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useEtiquetaMoneda } from '@/shell/hooks/datos/useMonedaCodigo'
import { useData } from '@/shell/providers/DataProvider'
import type { Activo, ActivoIn } from '@/types'
import { FormModal } from '@/controls/forms/FormModal'

export function ActivoForm({ activo }: { activo: Activo | null }) {
  const { hoy } = useData().estado
  const t = useMeta()?.textos.activo
  const conMoneda = useEtiquetaMoneda()
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
      ...(valAct.trim() !== '' && { valor_actual: valorActual }),
    }
    await guardar(data)
  }

  return (
    <FormModal>
      <NombreField value={nombre} onChange={setNombre} placeholder={t?.placeholder_nombre} />
      <div className="form-row-2">
        <MoneyField id="m-val-ini" label={conMoneda(esEdicion ? t?.label_valor_inicial_edicion : t?.label_valor_inicial_nuevo)} value={valIni} onChange={setValIni} />
        <MoneyField id="m-val-act" label={conMoneda(t?.label_valor_actual)} value={valAct} onChange={setValAct} placeholder={t?.placeholder_valor_actual} />
      </div>
      <FechaField id="m-fecha-adq" label={t?.label_fecha ?? ''} value={fechaAdq} onChange={setFechaAdq} type="date" />
      {!esEdicion && <CrearTxToggle checked={esNueva} onChange={setEsNueva} />}
      <FormFooter saveLabel={etiquetaGuardar(t?.guardar)} onSave={() => void save()} onDelete={eliminar} />
    </FormModal>
  )
}
