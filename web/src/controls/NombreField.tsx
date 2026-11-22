interface Props {
  value: string
  onChange: (v: string) => void
  placeholder: string
}

export function NombreField({ value, onChange, placeholder }: Props) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor="m-nombre">
        Nombre
      </label>
      <input
        className="form-input"
        type="text"
        id="m-nombre"
        maxLength={40}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
