import { cn } from '@/lib/utils'
import { AdvancedToggle } from './AdvancedToggle'
import { DatePicker } from './DatePicker'

const labelSmall = 'font-normal text-muted-foreground'

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

type NotasProps = { id: string; placeholder: string; value: string; onChange: (v: string) => void; labelClassName?: string }

export function NotasField({ id, placeholder, value, onChange, labelClassName = labelSmall }: NotasProps) {
  return (
    <div className="form-group">
      <label className={cn('form-label', labelClassName)} htmlFor={id}>
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

export function RegistrarToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <AdvancedToggle
      checked={checked}
      onChange={onChange}
      label="Registrar en transacciones"
      hint="Desactivá si ya lo registraste en otra parte."
    />
  )
}
