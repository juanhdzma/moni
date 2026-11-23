import { useState } from 'react'
import { AdvancedToggle } from '../../../controls/AdvancedToggle'
import { DatePicker } from '../../../controls/DatePicker'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyField } from '../../../controls/MoneyField'
import { NombreField } from '../../../controls/NombreField'
import { Select } from '../../../controls/Select'
import { TipoToggle } from '../../../controls/TipoToggle'
import { numToInput, parseMoney, soloFecha } from '../../../lib/format'
import { useConfirmDelete } from '@/shell/hooks/useConfirmDelete'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMeta } from '@/shell/hooks/useMeta'
import { useMutations } from '@/shell/hooks/useMutations'
import type { Deuda, DeudaIn } from '../../../types'

export function DeudaForm({ d }: { d: Deuda | null }) {
  const guardar = useGuardar()
  const { crudOp } = useMutations()
  const meta = useMeta()
  const eliminar = useConfirmDelete('deuda', d, `¿Eliminar "${d?.nombre}"?`)
  const isEdit = d !== null
  const [esTarjeta, setEsTarjeta] = useState(d?.es_tarjeta ?? false)
  const [nombre, setNombre] = useState(d?.nombre || '')
  const [montoIni, setMontoIni] = useState(d ? numToInput(d.monto_inicial) : '')
  const [cupo, setCupo] = useState(d ? numToInput(d.cupo) : '')
  const [franquicia, setFranquicia] = useState(d?.franquicia || 'Visa')
  const [saldo, setSaldo] = useState(d ? numToInput(d.saldo_actual) : '')
  const [tasa, setTasa] = useState(d?.tasa_ea ? String(d.tasa_ea) : '')
  const [cuota, setCuota] = useState(d ? numToInput(d.cuota_mensual) : '')
  const [fechaIni, setFechaIni] = useState(soloFecha(d?.fecha_inicio))
  const [proxima, setProxima] = useState(soloFecha(d?.proxima_cuota))
  const [esNueva, setEsNueva] = useState(true)

  const save = async () => {
    const data: DeudaIn = {
      nombre: nombre.trim(),
      monto_inicial: parseMoney(montoIni),
      saldo_actual: parseMoney(saldo),
      tasa_ea: parseFloat(tasa) || 0,
      cuota_mensual: parseMoney(cuota),
      fecha_inicio: fechaIni,
      proxima_cuota: proxima,
      es_tarjeta: esTarjeta,
      cupo: parseMoney(cupo),
      franquicia,
    }
    await guardar(async () => {
      if (d) await crudOp('deuda', 'update', { ...data, id: d.id })
      else await crudOp('deuda', 'add', { ...data, crear_tx: esNueva })
    })
  }

  return (
    <>
      <TipoToggle
        value={esTarjeta ? 'tarjeta' : 'prestamo'}
        opciones={meta?.clases_deuda ?? []}
        onChange={(v) => setEsTarjeta(v === 'tarjeta')}
      />
      <NombreField value={nombre} onChange={setNombre} placeholder={esTarjeta ? 'Ej. Tarjeta Visa' : 'Ej. Crédito de consumo'} />
      <div id="wrap-monto-ini" style={esTarjeta ? { display: 'none' } : undefined}>
        <MoneyField id="m-monto-ini" label={`${isEdit ? 'Monto inicial' : 'Monto del crédito'} (COP)`} value={montoIni} onChange={setMontoIni} />
      </div>
      <div id="wrap-cupo" style={esTarjeta ? undefined : { display: 'none' }}>
        <MoneyField id="m-cupo" label="Cupo (COP)" value={cupo} onChange={setCupo} />
        <div className="form-group">
          <label className="form-label" htmlFor="m-franquicia">Franquicia</label>
          <Select id="m-franquicia" value={franquicia} onChange={setFranquicia} options={meta?.franquicias ?? []} />
        </div>
      </div>
      <MoneyField
        id="m-saldo"
        label={`${esTarjeta ? 'Deuda actual' : 'Saldo actual'} (COP)`}
        value={saldo}
        onChange={setSaldo}
        hint={esTarjeta ? 'Dejá 0 si la tarjeta todavía no tiene gastos.' : undefined}
      />
      <div id="wrap-prestamo-fields" style={esTarjeta ? { display: 'none' } : undefined}>
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
      <div id="wrap-advanced" style={esTarjeta ? { display: 'none' } : undefined}>
        {!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
      </div>
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar deuda'} onSave={() => void save()} onDelete={eliminar} />
    </>
  )
}
