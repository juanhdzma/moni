import { FechaField, NotasField } from '../../../controls/FormFields'

type Props = {
  fechaLabel: string
  fecha: string
  onFecha: (v: string) => void
  notas: string
  onNotas: (v: string) => void
  notasPlaceholder: string
}

export function FechaNotas({ fechaLabel, fecha, onFecha, notas, onNotas, notasPlaceholder }: Props) {
  return (
    <>
      <FechaField id="m-fecha" label={fechaLabel} value={fecha} onChange={onFecha} />
      <NotasField id="m-notas" placeholder={notasPlaceholder} value={notas} onChange={onNotas} labelClassName="text-muted-foreground" />
    </>
  )
}
