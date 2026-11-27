import { useMeta } from '@/shell/hooks/datos/useMeta'
import { Campo } from '@/controls/inputs/Campo'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function NombreField({ value, onChange, placeholder }: Props) {
  const maxLength = useMeta()?.limites.nombre
  return (
    <Campo id="m-nombre" label="Nombre">
      <input
        className="form-input"
        type="text"
        id="m-nombre"
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Campo>
  )
}
