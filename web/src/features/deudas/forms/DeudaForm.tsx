import { useState } from 'react'
import { AdvancedToggle } from '../../../controls/AdvancedToggle'
import { DatePicker } from '../../../controls/DatePicker'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyField } from '../../../controls/MoneyField'
import { NombreField } from '../../../controls/NombreField'
import { Select } from '../../../controls/Select'
import { TipoToggle } from '../../../controls/TipoToggle'
import { entero, parseMoney, soloFecha } from '../../../lib/format'
import { useGuardarEntidad } from '@/shell/hooks/useGuardarEntidad'
import { useMeta } from '@/shell/hooks/useMeta'
import type { Deuda } from '../../../types'

export function DeudaForm({ d }: { d: Deuda | null }) {
  const meta = useMeta()
  const { guardar, eliminar, esEdicion: isEdit, etiquetaGuardar } = useGuardarEntidad('deuda', {
    item: d,
    conNuevo: (data) => ({ ...data, crear_tx: esNueva }),
  })
  const [claseSel, setClaseSel] = useState<string | null>(d ? (d.es_tarjeta ? 'tarjeta' : 'prestamo') : null)
  const clase = claseSel ?? meta?.defaults.clase_deuda ?? ''
  const esTarjeta = clase === 'tarjeta'
  const [nombre, setNombre] = useState(d?.nombre || '')
  const [montoIni, setMontoIni] = useState(d ? entero(d.monto_inicial) : '')
  const [cupo, setCupo] = useState(d ? entero(d.cupo) : '')
  const [franquicia, setFranquicia] = useState(d?.franquicia || null)
  const [saldo, setSaldo] = useState(d ? entero(d.saldo_actual) : '')
  const [tasa, setTasa] = useState(d?.tasa_ea ? String(d.tasa_ea) : '')
  const [cuota, setCuota] = useState(d ? entero(d.cuota_mensual) : '')
  const [fechaIni, setFechaIni] = useState(soloFecha(d?.fecha_inicio))
  const [proxima, setProxima] = useState(soloFecha(d?.proxima_cuota))
  const [esNueva, setEsNueva] = useState(true)

  const franquiciaActual = franquicia ?? meta?.defaults.franquicia ?? ''

  const save = async () => {
    await guardar({
      nombre: nombre.trim(),
      monto_inicial: parseMoney(montoIni),
      saldo_actual: parseMoney(saldo),
      tasa_ea: parseFloat(tasa) || 0,
      cuota_mensual: parseMoney(cuota),
      fecha_inicio: fechaIni,
      proxima_cuota: proxima,
      es_tarjeta: esTarjeta,
      cupo: parseMoney(cupo),
      franquicia: franquiciaActual,
    })
  }

  return (
    <>
      <TipoToggle
        value={clase}
        opciones={meta?.clases_deuda ?? []}
        onChange={setClaseSel}
      />
      <NombreField value={nombre} onChange={setNombre} placeholder={esTarjeta ? 'Ej. Tarjeta Visa' : 'Ej. Crédito de consumo'} />
      {!esTarjeta && (
        <div id="wrap-monto-ini">
          <MoneyField id="m-monto-ini" label={`${isEdit ? 'Monto inicial' : 'Monto del crédito'} (COP)`} value={montoIni} onChange={setMontoIni} />
        </div>
      )}
      {esTarjeta && (
        <div id="wrap-cupo">
          <MoneyField id="m-cupo" label="Cupo (COP)" value={cupo} onChange={setCupo} />
          <div className="form-group">
            <label className="form-label" htmlFor="m-franquicia">Franquicia</label>
            <Select id="m-franquicia" value={franquiciaActual} onChange={setFranquicia} options={meta?.franquicias ?? []} />
          </div>
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
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="m-tasa">Tasa EA (%)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                id="m-tasa"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                placeholder="24"
              />
            </div>
            <MoneyField id="m-cuota" label="Cuota mensual" value={cuota} onChange={setCuota} />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="m-fecha-ini">Fecha inicio</label>
              <DatePicker id="m-fecha-ini" value={fechaIni} onChange={setFechaIni} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-proxima">Próxima cuota</label>
              <DatePicker id="m-proxima" value={proxima} onChange={setProxima} />
            </div>
          </div>
        </div>
      )}
      {!esTarjeta && (
        <div id="wrap-advanced">
          {!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
        </div>
      )}
      <FormFooter saveLabel={etiquetaGuardar('Agregar deuda')} onSave={() => void save()} onDelete={eliminar} />
    </>
  )
}
