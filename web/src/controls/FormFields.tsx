import type { CamposMovimiento } from '@/shell/hooks/useCamposMovimiento'
import { AdvancedToggle } from './AdvancedToggle'
import { DatePicker } from './DatePicker'

type FechaProps = { id: string; label: string; value: string; onChange: (v: string) => void; type?: 'date' | 'datetime-local' }

export function FechaField({ id, label, value, onChange, type = 'datetime-local' }: FechaProps) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <DatePicker id={id} type={type} value={value} onChange={onChange} />
    </div>
  )
}

type NotasProps = {
  id: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}

function NotasField({ id, placeholder, value, onChange }: NotasProps) {
  return (
    <div className="form-group">
      <label className="form-label font-normal text-muted-foreground" htmlFor={id}>
        Notas (opcional)
      </label>
      <input
        className="form-input"
        type="text"
        id={id}
        maxLength={30}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

type FechaNotasProps = {
  fechaLabel: string
  fecha: string
  onFecha: (v: string) => void
  notas: string
  onNotas: (v: string) => void
  notasPlaceholder: string
  fechaType?: 'date' | 'datetime-local'
  fechaId?: string
  notasId?: string
}

export function FechaNotas({ fechaLabel, fecha, onFecha, notas, onNotas, notasPlaceholder, fechaType, fechaId = 'm-fecha', notasId = 'm-notas' }: FechaNotasProps) {
  return (
    <>
      <FechaField id={fechaId} label={fechaLabel} value={fecha} onChange={onFecha} type={fechaType} />
      <NotasField id={notasId} placeholder={notasPlaceholder} value={notas} onChange={onNotas} />
    </>
  )
}

type RegistrarProps = { checked: boolean; onChange: (v: boolean) => void; label?: string }

export function RegistrarToggle({ checked, onChange, label = 'Registrar en transacciones' }: RegistrarProps) {
  return <AdvancedToggle checked={checked} onChange={onChange} label={label} hint="Desactivá si ya lo registraste en otra parte." />
}

type MovimientoProps = {
  campos: CamposMovimiento
  fechaLabel: string
  notasPlaceholder: string
  fechaType?: 'date' | 'datetime-local'
}

export function MovimientoCampos({ campos, fechaLabel, notasPlaceholder, fechaType }: MovimientoProps) {
  return (
    <>
      <FechaNotas
        fechaLabel={fechaLabel}
        fecha={campos.fecha}
        onFecha={campos.setFecha}
        notas={campos.notas}
        onNotas={campos.setNotas}
        notasPlaceholder={notasPlaceholder}
        fechaType={fechaType}
      />
      <RegistrarToggle checked={campos.registrar} onChange={campos.setRegistrar} />
    </>
  )
}
