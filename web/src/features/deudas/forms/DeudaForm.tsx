import { useState } from 'react'
import { AdvancedToggle } from '@/controls/AdvancedToggle'
import { Campo } from '@/controls/Campo'
import { DatePicker } from '@/controls/DatePicker'
import { FormFooter } from '@/controls/FormFooter'
import { MoneyField } from '@/controls/MoneyField'
import { NombreField } from '@/controls/NombreField'
import { Select } from '@/controls/Select'
import { TasaField } from '@/controls/TasaField'
import { TipoToggle } from '@/controls/TipoToggle'
import { entero, parseMoney, soloFecha } from '@/lib/format'
import { useGuardarEntidad } from '@/shell/hooks/useGuardarEntidad'
import { useMeta } from '@/shell/hooks/useMeta'
import type { Deuda, DeudaIn } from '@/types'
import { FormModal } from '@/controls/FormModal'

export function DeudaForm({ d }: { d: Deuda | null }) {
  const meta = useMeta()
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
          <MoneyField id="m-monto-ini" label={`${isEdit ? 'Monto inicial' : 'Monto del crédito'} (COP)`} value={montoIni} onChange={setMontoIni} />
        </div>
      )}
      {esTarjeta && (
        <div id="wrap-cupo">
          <MoneyField id="m-cupo" label="Cupo (COP)" value={cupo} onChange={setCupo} />
          <Campo id="m-franquicia" label="Franquicia">
            <Select id="m-franquicia" value={franquiciaActual} onChange={setFranquicia} options={meta?.franquicias ?? []} />
          </Campo>
        </div>
      )}
      <MoneyField
        id="m-saldo"
        label={`${esTarjeta ? 'Deuda actual' : 'Saldo actual'} (COP)`}
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
      {!esTarjeta && <div id="wrap-advanced">{!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}</div>}
      <FormFooter saveLabel={etiquetaGuardar('Agregar deuda')} onSave={() => void save()} onDelete={eliminar} />
    </FormModal>
  )
}
