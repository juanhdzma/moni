import { useState } from 'react'
import { CrearTxToggle } from '@/controls/inputs/OpcionesRegistro'
import { Campo } from '@/controls/inputs/Campo'
import { DatePicker } from '@/controls/inputs/DatePicker'
import { FormFooter } from '@/controls/forms/FormFooter'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { NombreField } from '@/controls/inputs/NombreField'
import { Select } from '@/controls/inputs/Select'
import { TasaField } from '@/controls/inputs/TasaField'
import { TipoToggle } from '@/controls/inputs/TipoToggle'
import { entero, parseMoney, soloFecha } from '@/lib/format'
import { useGuardarEntidad } from '@/shell/hooks/acciones/useGuardarEntidad'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useEtiquetaMoneda } from '@/shell/hooks/datos/useMonedaCodigo'
import type { Deuda, DeudaIn } from '@/types'
import { FormModal } from '@/controls/forms/FormModal'

export function DeudaForm({ d }: { d: Deuda | null }) {
  const meta = useMeta()
  const conMoneda = useEtiquetaMoneda()
  const { guardar, eliminar, esEdicion: isEdit, etiquetaGuardar } = useGuardarEntidad('deuda', {
    item: d,
    conNuevo: (data) => ({ ...data, crear_tx: esNueva }),
  })
  const [claseSel, setClaseSel] = useState<string | null>(null)
  const clase = claseSel ?? d?.clase_deuda ?? meta?.defaults.clase_deuda ?? ''
  const esTarjeta = meta?.clases_deuda.find((c) => c.value === clase)?.es_tarjeta ?? false
  const [nombre, setNombre] = useState(d?.nombre || '')
  const [montoIni, setMontoIni] = useState(d ? entero(d.monto_inicial) : '')
  const [cupo, setCupo] = useState(d ? entero(d.cupo) : '')
  const [franquicia, setFranquicia] = useState<string | null>(d?.franquicia || null)
  const [saldo, setSaldo] = useState(d ? entero(d.saldo_actual) : '')
  const [tasa, setTasa] = useState(d?.tasa_ea ? String(d.tasa_ea) : '')
  const [tipoTasa, setTipoTasa] = useState(meta?.defaults.tipo_tasa ?? '')
  const [cuota, setCuota] = useState(d ? entero(d.cuota_mensual) : '')
  const [fechaIni, setFechaIni] = useState(soloFecha(d?.fecha_inicio))
  const [proxima, setProxima] = useState(soloFecha(d?.proxima_cuota))
  const [esNueva, setEsNueva] = useState(true)

  const franquiciaActual = franquicia ?? meta?.defaults.franquicia ?? ''
  const tasaVal = parseFloat(tasa) || 0
  const tasaNoDefault = tasaVal > 0 && tipoTasa !== meta?.defaults.tipo_tasa

  const save = async () => {
    const data: DeudaIn = {
      nombre: nombre.trim(),
      monto_inicial: parseMoney(montoIni),
      saldo_actual: parseMoney(saldo),
      tasa_ea: tasaVal,
      cuota_mensual: parseMoney(cuota),
      fecha_inicio: fechaIni,
      proxima_cuota: proxima,
      clase_deuda: clase as DeudaIn['clase_deuda'],
      cupo: parseMoney(cupo),
      franquicia: franquiciaActual as DeudaIn['franquicia'],
      ...(tasaNoDefault && { tasa_tipo: tipoTasa as DeudaIn['tasa_tipo'] }),
    }
    await guardar(data)
  }

  return (
    <FormModal>
      <TipoToggle value={clase} opciones={meta?.clases_deuda ?? []} onChange={setClaseSel} />
      <NombreField value={nombre} onChange={setNombre} placeholder={esTarjeta ? 'Ej. Tarjeta Visa' : 'Ej. Crédito de consumo'} />
      {!esTarjeta && (
        <div id="wrap-monto-ini">
          <MoneyField id="m-monto-ini" label={conMoneda(isEdit ? 'Monto inicial' : 'Monto del crédito')} value={montoIni} onChange={setMontoIni} />
        </div>
      )}
      {esTarjeta && (
        <div id="wrap-cupo">
          <MoneyField id="m-cupo" label={conMoneda('Cupo')} value={cupo} onChange={setCupo} />
          <Campo id="m-franquicia" label="Franquicia">
            <Select id="m-franquicia" value={franquiciaActual} onChange={setFranquicia} options={meta?.franquicias ?? []} />
          </Campo>
        </div>
      )}
      <MoneyField
        id="m-saldo"
        label={conMoneda(esTarjeta ? 'Deuda actual' : 'Saldo actual')}
        value={saldo}
        onChange={setSaldo}
        hint={esTarjeta ? 'Dejá 0 si la tarjeta todavía no tiene gastos.' : undefined}
      />
      {!esTarjeta && (
        <div id="wrap-prestamo-fields">
          <TasaField label="Tasa (%)" value={tasa} onChange={setTasa} tipo={tipoTasa} onTipo={setTipoTasa} placeholder="24" />
          <MoneyField id="m-cuota" label="Cuota mensual" value={cuota} onChange={setCuota} />
          <div className="form-row-2">
            <Campo id="m-fecha-ini" label="Fecha inicio">
              <DatePicker id="m-fecha-ini" value={fechaIni} onChange={setFechaIni} />
            </Campo>
            <Campo id="m-proxima" label="Próxima cuota">
              <DatePicker id="m-proxima" value={proxima} onChange={setProxima} />
            </Campo>
          </div>
        </div>
      )}
      {!esTarjeta && <div id="wrap-advanced">{!isEdit && <CrearTxToggle checked={esNueva} onChange={setEsNueva} />}</div>}
      <FormFooter saveLabel={etiquetaGuardar('Agregar deuda')} onSave={() => void save()} onDelete={eliminar} />
    </FormModal>
  )
}
