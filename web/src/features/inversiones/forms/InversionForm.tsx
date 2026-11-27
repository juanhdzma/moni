import { useState } from 'react'
import { CrearTxToggle } from '@/controls/inputs/OpcionesRegistro'
import { Campo, NumeroField } from '@/controls/inputs/Campo'
import { DatePicker } from '@/controls/inputs/DatePicker'
import { FormFooter } from '@/controls/forms/FormFooter'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { NombreField } from '@/controls/inputs/NombreField'
import { TasaField } from '@/controls/inputs/TasaField'
import { TipoToggle } from '@/controls/inputs/TipoToggle'
import { entero, parseMoney, soloFecha } from '@/lib/format'
import { useGuardarEntidad } from '@/shell/hooks/acciones/useGuardarEntidad'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useData } from '@/shell/providers/DataProvider'
import type { InvIn, Inversion, Meta } from '@/types'
import { FormModal } from '@/controls/forms/FormModal'

export function InversionForm({ inv }: { inv: Inversion | null }) {
  const meta = useMeta()
  return meta ? <InversionCampos inv={inv} meta={meta} /> : null
}

function InversionCampos({ inv, meta }: { inv: Inversion | null; meta: Meta }) {
  const { estado } = useData()
  const { guardar, eliminar, esEdicion: isEdit, etiquetaGuardar } = useGuardarEntidad('inv', {
    item: inv,
    conNuevo: (data) => ({ ...data, crear_tx: esNueva }),
  })
  const [nombre, setNombre] = useState(inv?.nombre ?? '')
  const [tipoElegido, setTipo] = useState<string | null>(null)
  const tipo = tipoElegido ?? inv?.tipo ?? meta.defaults.tipo_inversion
  const [invertido, setInvertido] = useState(inv ? entero(inv.monto_invertido) : '')
  const [actual, setActual] = useState(inv ? entero(inv.valor_actual) : '')
  const [tasa, setTasa] = useState(inv?.tasa_ea ? String(inv.tasa_ea) : '')
  const [tipoTasa, setTipoTasa] = useState(meta.defaults.tipo_tasa)
  const [pagoElegido, setPago] = useState<string | null>(null)
  const pago = pagoElegido ?? inv?.pago ?? meta.defaults.pago_inversion
  const [diaPago, setDiaPago] = useState(inv?.dia_pago ? String(inv.dia_pago) : '')
  const [fecha, setFecha] = useState(soloFecha(inv?.fecha_inicio) || estado.hoy)
  const [esNueva, setEsNueva] = useState(true)

  const campos = meta.tipos_inversion.find((t) => t.value === tipo)?.campos ?? []
  const conTasa = campos.includes('tasa')
  const conPago = campos.includes('pago')
  const pideDia = conPago && Boolean(meta.pagos_inversion.find((p) => p.value === pago)?.requiere_dia)

  const save = async () => {
    const valorIngresado = parseMoney(actual)
    const tasa_ea = parseFloat(tasa) || null

    const data: InvIn = {
      nombre: nombre.trim(),
      tipo: tipo as InvIn['tipo'],
      monto_invertido: parseMoney(invertido),
      ...(valorIngresado ? { valor_actual: valorIngresado } : {}),
      tasa_ea,
      fecha_inicio: fecha,
      pago: pago as InvIn['pago'],
      dia_pago: parseInt(diaPago) || null,
      ...(tasa_ea !== null ? { tasa_tipo: tipoTasa as InvIn['tasa_tipo'] } : {}),
    }

    await guardar(data)
  }

  return (
    <FormModal>
      <NombreField value={nombre} onChange={setNombre} placeholder="Ej. CDT Bancolombia" />
      {isEdit ? (
        <div className="form-group">
          <div className="form-label">Tipo</div>
          <div className="rounded-md border bg-muted px-3 py-2 text-body font-medium text-muted-foreground">
            {meta.tipos_inversion.find((t) => t.value === tipo)?.label}
          </div>
        </div>
      ) : (
        <TipoToggle value={tipo} opciones={meta.tipos_inversion} onChange={setTipo} />
      )}
      <div className="form-row-2">
        <MoneyField id="m-invertido" label="Monto invertido" value={invertido} onChange={setInvertido} />
        <MoneyField id="m-actual" label="Valor actual" value={actual} onChange={setActual} />
      </div>
      {conTasa && <TasaField label="Tasa de rendimiento" value={tasa} onChange={setTasa} tipo={tipoTasa} onTipo={setTipoTasa} placeholder="0" />}
      {conPago && (
        <div id="m-pago-wrap">
          <TipoToggle label={meta.textos.inversion.label_pago} value={pago} opciones={meta.pagos_inversion} idPrefix="rp" onChange={setPago} />
        </div>
      )}
      {pideDia && (
        <div id="m-dia-pago-wrap">
          <NumeroField id="m-dia-pago" label="Día del mes que paga" value={diaPago} onChange={setDiaPago} min={1} max={meta.limites.dia_pago_max} placeholder="Ej. 15" />
        </div>
      )}
      <Campo id="m-fecha-ini" label="Fecha inicio">
        <DatePicker id="m-fecha-ini" value={fecha} onChange={setFecha} />
      </Campo>
      {!isEdit && <CrearTxToggle checked={esNueva} onChange={setEsNueva} />}
      <FormFooter saveLabel={etiquetaGuardar('Agregar inversión')} onSave={() => void save()} onDelete={eliminar} />
    </FormModal>
  )
}
