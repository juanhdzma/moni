import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { signStr } from '@/lib/format'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { cn } from '@/lib/utils'
import { claseDeTono, tonoDeValor } from './tono'

type Cuando = 'siempre' | 'negativo' | 'ninguno'

const aplica = (cuando: Cuando, activo: boolean): boolean => cuando === 'siempre' || (cuando === 'negativo' && activo)

function Flecha({ valor }: { valor: number }) {
  if (valor === 0) return null
  const Icono = valor > 0 ? ArrowUp : ArrowDown
  return <Icono className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" />
}

interface MontoProps {
  valor: number
  tono?: string
  formato?: (n: number) => string
  sufijo?: string
  signo?: Cuando
  color?: Cuando
  chip?: boolean
  flecha?: boolean
  className?: string
}

export function Monto({ valor, tono: tonoBackend, formato, sufijo = '', signo = 'siempre', color = 'siempre', chip = false, flecha = false, className }: MontoProps) {
  const { cop } = useMoneda()
  const formatear = formato ?? cop
  const tono = tonoBackend ?? tonoDeValor(valor)
  const clase = aplica(color, tono === 'negativo') ? claseDeTono(tono)[chip ? 'chip' : 'texto'] : undefined
  return (
    <span className={cn(clase, className)}>
      {flecha && <Flecha valor={valor} />}
      {valor !== 0 && aplica(signo, valor < 0) && signStr(valor)}
      {formatear(Math.abs(valor))}
      {sufijo}
    </span>
  )
}

export function Tendencia({ valor, children }: { valor: number; children: ReactNode }) {
  return (
    <span className={claseDeTono(tonoDeValor(valor)).texto}>
      <Flecha valor={valor} />
      {children}
    </span>
  )
}
