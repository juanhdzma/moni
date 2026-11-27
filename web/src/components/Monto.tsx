import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { pct } from '@/lib/format'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { cn } from '@/lib/utils'
import { claseDeTono } from '@/components/tono'

type Cuando = 'siempre' | 'negativo' | 'ninguno'

const aplica = (cuando: Cuando, activo: boolean): boolean => cuando === 'siempre' || (cuando === 'negativo' && activo)

const SIGNO_NEGATIVO = '−'

function Flecha({ signo }: { signo: string }) {
  if (signo === '') return null
  const Icono = signo === SIGNO_NEGATIVO ? ArrowDown : ArrowUp
  return <Icono className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" />
}

interface MontoProps {
  valor: number
  tono: string
  signo: string
  formato?: (n: number) => string
  sufijo?: string
  mostrarSigno?: Cuando
  color?: Cuando
  chip?: boolean
  flecha?: boolean
  className?: string
}

export function Monto({ valor, tono, signo, formato, sufijo = '', mostrarSigno = 'siempre', color = 'siempre', chip = false, flecha = false, className }: MontoProps) {
  const { cop } = useMoneda()
  const formatear = formato ?? cop
  const clase = aplica(color, tono === 'negativo') ? claseDeTono(tono)[chip ? 'chip' : 'texto'] : undefined
  return (
    <span className={cn(clase, className)}>
      {flecha && <Flecha signo={signo} />}
      {aplica(mostrarSigno, signo === SIGNO_NEGATIVO) && signo}
      {formatear(Math.abs(valor))}
      {sufijo}
    </span>
  )
}

export function Tendencia({ tono, signo, children }: { tono: string; signo: string; children: ReactNode }) {
  return (
    <span className={claseDeTono(tono).texto}>
      <Flecha signo={signo} />
      {children}
    </span>
  )
}

interface VariacionProps {
  valor: number
  tono: string
  signo: string
  porcentaje?: number
}

export function Variacion({ valor, tono, signo, porcentaje }: VariacionProps) {
  return (
    <span>
      <Monto valor={valor} tono={tono} signo={signo} />
      {porcentaje !== undefined && (
        <>
          {' '}
          <span className="text-xs font-medium">
            (<Monto valor={porcentaje} tono={tono} signo={signo} formato={pct} sufijo="%" />)
          </span>
        </>
      )}
    </span>
  )
}
