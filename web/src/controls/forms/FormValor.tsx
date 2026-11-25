import type { ComponentProps, ReactNode } from 'react'
import { BreakdownVariacion } from '@/controls/desglose/BreakdownVariacion'
import { FechaField } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { ModalPanel } from '@/controls/forms/ModalPanel'
import { MoneyField } from '@/controls/inputs/MoneyField'
import { FormModal } from '@/controls/forms/FormModal'

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
