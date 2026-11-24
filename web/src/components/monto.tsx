import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { signStr } from '@/lib/format'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { cn } from '@/lib/utils'

function tonoDe(valor: number) {
  const positivo = valor >= 0
  return {
    positivo,
    signo: signStr(valor),
    texto: positivo ? 'text-inversiones-text' : 'text-deudas',
    chip: positivo ? 'bg-inversiones/15 text-inversiones-text' : 'bg-deudas/15 text-deudas',
    Flecha: positivo ? ArrowUp : ArrowDown,
  }
}

type Cuando = 'siempre' | 'negativo' | 'ninguno'

const aplica = (cuando: Cuando, valor: number): boolean => cuando === 'siempre' || (cuando === 'negativo' && valor < 0)

interface MontoProps {
  valor: number
  formato?: (n: number) => string
  sufijo?: string
  signo?: Cuando
  color?: Cuando
  chip?: boolean
  flecha?: boolean
  className?: string
}

export function Monto({ valor, formato, sufijo = '', signo = 'siempre', color = 'siempre', chip = false, flecha = false, className }: MontoProps) {
  const { cop } = useMoneda()
  const formatear = formato ?? cop
  const tono = tonoDe(valor)
  const clase = aplica(color, valor) ? (chip ? tono.chip : tono.texto) : undefined
  return (
    <span className={cn(clase, className)}>
      {flecha && <tono.Flecha className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" />}
      {aplica(signo, valor) && tono.signo}
      {formatear(Math.abs(valor))}
      {sufijo}
    </span>
  )
}

export function Tendencia({ valor, children }: { valor: number; children: ReactNode }) {
  const tono = tonoDe(valor)
  return (
    <span className={tono.texto}>
      <tono.Flecha className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" />
      {children}
    </span>
  )
}
