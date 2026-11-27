import { useMeta } from '@/shell/hooks/datos/useMeta'
import type { CamposMovimiento } from '@/shell/hooks/formulario/useCamposMovimiento'
import { RegistrarToggle } from '@/controls/inputs/OpcionesRegistro'
import { Campo } from '@/controls/inputs/Campo'
import { DatePicker } from '@/controls/inputs/DatePicker'

export { RegistrarToggle }

type FechaProps = { id: string; label: string; value: string; onChange: (v: string) => void; type?: 'date' | 'datetime-local' }

export function FechaField({ id, label, value, onChange, type = 'datetime-local' }: FechaProps) {
  return (
    <Campo id={id} label={label}>
      <DatePicker id={id} type={type} value={value} onChange={onChange} />
    </Campo>
  )
}

type NotasProps = {
  id: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}

function NotasField({ id, placeholder, value, onChange }: NotasProps) {
  const maxLength = useMeta()?.limites.notas
  return (
    <Campo id={id} label="Notas (opcional)" labelClassName="font-normal text-muted-foreground">
      <input
        className="form-input"
        type="text"
        id={id}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Campo>
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

type MovimientoProps = {
  campos: CamposMovimiento
  fechaLabel: string
  notasPlaceholder: string
  fechaType?: 'date' | 'datetime-local'
  fechaId?: string
  notasId?: string
  conRegistrar?: boolean
  registrarLabel?: string
}

export function MovimientoCampos({ campos, fechaLabel, notasPlaceholder, fechaType, fechaId, notasId, conRegistrar = true, registrarLabel }: MovimientoProps) {
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
        fechaId={fechaId}
        notasId={notasId}
      />
      {conRegistrar && <RegistrarToggle checked={campos.registrar} onChange={campos.setRegistrar} label={registrarLabel} />}
    </>
  )
}
