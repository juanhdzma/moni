import type { ComponentProps, ReactNode } from 'react'
import { BreakdownVariacion } from './BreakdownVariacion'
import { FechaField } from './FormFields'
import { FormFooter } from './FormFooter'
import { ModalPanel } from './ModalPanel'
import { MoneyField } from './MoneyField'
import { FormModal } from './FormModal'

type Panel = ComponentProps<typeof ModalPanel>
type Footer = ComponentProps<typeof FormFooter>

interface Props {
  panel: Panel
  label: string
  valor: string
  onValor: (v: string) => void
  variacion: ComponentProps<typeof BreakdownVariacion>
  fechaLabel: string
  fecha: string
  onFecha: (v: string) => void
  fechaType?: 'date' | 'datetime-local'
  footer: Footer
  children?: ReactNode
}

export function FormValor({ panel, label, valor, onValor, variacion, fechaLabel, fecha, onFecha, fechaType = 'date', footer, children }: Props) {
  return (
    <FormModal>
      <ModalPanel {...panel} />
      <MoneyField id="m-nuevo-valor" label={label} value={valor} onChange={onValor} />
      <BreakdownVariacion {...variacion} />
      <FechaField id="m-fecha" type={fechaType} label={fechaLabel} value={fecha} onChange={onFecha} />
      {children}
      <FormFooter {...footer} />
    </FormModal>
  )
}
