import { useState } from 'react'
import { AdvancedToggle } from '../../../controls/AdvancedToggle'
import { DatePicker } from '../../../controls/DatePicker'
import { MoneyField } from '../../../controls/MoneyField'
import { NombreField } from '../../../controls/NombreField'
import { TipoToggle } from '../../../controls/TipoToggle'
import { cargarTasa } from '../../../lib/api'
import { useData } from '@/shell/providers/DataProvider'
import { entero, parseMoney, soloFecha } from '../../../lib/format'
import { useGuardarEntidad } from '@/shell/hooks/useGuardarEntidad'
import { useMeta } from '@/shell/hooks/useMeta'
import { usePreview } from '@/shell/hooks/usePreview'
import { cn } from '@/lib/utils'
import type { InvIn, Inversion, Meta, PagoInv, TipoInv } from '../../../types'
import { FormFooter } from '../../../controls/FormFooter'
import { Hint } from '../../../controls/Hint'

const rateBtn = (active: boolean) =>
  cn('cursor-pointer px-3 py-2 text-sm font-semibold transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')

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
  const [tipoElegido, setTipo] = useState<TipoInv | null>(null)
  const tipo = tipoElegido ?? inv?.tipo ?? meta.defaults.tipo_inversion
  const [invertido, setInvertido] = useState(inv ? entero(inv.monto_invertido) : '')
  const [actual, setActual] = useState(inv ? entero(inv.valor_actual) : '')
  const [tasa, setTasa] = useState(inv?.tasa_ea ? String(inv.tasa_ea) : '')
  const [rateType, setRateType] = useState(meta.defaults.tipo_tasa)
  const [pagoElegido, setPago] = useState<PagoInv | null>(null)
  const pago = pagoElegido ?? inv?.pago ?? meta.defaults.pago_inversion
  const [diaPago, setDiaPago] = useState(inv?.dia_pago ? String(inv.dia_pago) : '')
  const [fecha, setFecha] = useState(soloFecha(inv?.fecha_inicio) || estado.hoy)
  const [esNueva, setEsNueva] = useState(true)

  const tasaVal = parseFloat(tasa) || 0
  const conv = usePreview(tasaVal > 0 ? `${rateType}:${tasaVal}` : null, () => cargarTasa(tasaVal, rateType))
  const equiv = conv?.texto ?? ''

  const save = async () => {
    const valorIngresado = parseMoney(actual)
    const tasa_ea = parseFloat(tasa) || null

    const data: InvIn = {
      nombre: nombre.trim(),
      tipo,
      monto_invertido: parseMoney(invertido),
      ...(valorIngresado ? { valor_actual: valorIngresado } : {}),
      tasa_ea,
      fecha_inicio: fecha,
      pago,
      dia_pago: parseInt(diaPago) || null,
      ...(tasa_ea !== null ? { tasa_tipo: rateType } : {}),
    }

    await guardar(data)
  }

  return (
    <>
      <NombreField value={nombre} onChange={setNombre} placeholder="Ej. CDT Bancolombia" />
      {isEdit ? (
        <div className="form-group">
          <div className="form-label">Tipo</div>
          <div className="rounded-md border bg-muted px-3 py-2 text-[15px] font-medium text-muted-foreground">
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
      {tipo === 'fija' && (
        <div id="m-tasa-wrap" className="form-group">
          <label className="form-label" htmlFor="m-tasa">
            Tasa de rendimiento
          </label>
          <div className="flex items-center gap-2">
            <input
              className="form-input flex-1"
              type="number"
              step="0.0001"
              id="m-tasa"
              value={tasa}
              placeholder="0"
              onChange={(e) => setTasa(e.target.value)}
            />
            <div className="flex shrink-0 overflow-hidden rounded-md border">
              {meta.tipos_tasa.map((t) => (
                <button key={t.value} type="button" className={rateBtn(rateType === t.value)} data-rate={t.value} aria-pressed={rateType === t.value} onClick={() => setRateType(t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Hint id="tasa-equiv">{equiv}</Hint>
        </div>
      )}
      {tipo === 'fija' && (
        <div id="m-pago-wrap">
          <TipoToggle
            label="Pago de rendimientos"
            value={pago}
            opciones={meta.pagos_inversion}
            idPrefix="rp"
            onChange={setPago}
          />
        </div>
      )}
      {tipo === 'fija' && pago === 'mensual' && (
        <div id="m-dia-pago-wrap" className="form-group">
          <label className="form-label" htmlFor="m-dia-pago">
            Día del mes que paga
          </label>
          <input
            className="form-input"
            type="number"
            id="m-dia-pago"
            min="1"
            max="31"
            value={diaPago}
            placeholder="Ej. 15"
            onChange={(e) => setDiaPago(e.target.value)}
          />
        </div>
      )}
      <div className="form-group">
        <label className="form-label" htmlFor="m-fecha-ini">
          Fecha inicio
        </label>
        <DatePicker id="m-fecha-ini" value={fecha} onChange={setFecha} />
      </div>
      {!isEdit && <AdvancedToggle checked={esNueva} onChange={setEsNueva} />}
      <FormFooter saveLabel={etiquetaGuardar('Agregar inversión')} onSave={() => void save()} onDelete={eliminar} />
    </>
  )
}
