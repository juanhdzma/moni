import { cargarTasa } from '@/lib/api'
import { useMeta } from '@/shell/hooks/useMeta'
import { usePreview } from '@/shell/hooks/usePreview'
import { NumeroField } from './Campo'
import { TipoToggle } from './TipoToggle'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  tipo: string
  onTipo: (tipo: string) => void
  placeholder?: string
}

export function TasaField({ label, value, onChange, tipo, onTipo, placeholder }: Props) {
  const tipos = useMeta()?.tipos_tasa ?? []
  const tasa = parseFloat(value) || 0
  const equivalencia = usePreview(tasa > 0 ? `${tipo}:${tasa}` : null, () => cargarTasa(tasa, tipo))
  return (
    <NumeroField
      id="m-tasa"
      label={label}
      value={value}
      onChange={onChange}
      step="0.0001"
      placeholder={placeholder}
      hint={equivalencia?.texto}
      hintId="tasa-equiv"
      derecha={<TipoToggle inline label="Tipo de tasa" value={tipo} opciones={tipos} onChange={onTipo} />}
    />
  )
}
