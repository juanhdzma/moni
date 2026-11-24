import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface LadoPanel {
  label: string
  valor: ReactNode
  clase?: string
  detalle?: string
}

function Lado({ lado, derecha }: { lado: LadoPanel; derecha: boolean }) {
  return (
    <div className={cn('modal-panel-col', derecha && 'right')}>
      {lado.detalle && <div className="text-xs text-muted-foreground">{lado.detalle}</div>}
      <div className="modal-panel-label">{lado.label}</div>
      <div className={cn(derecha ? 'text-base font-semibold' : 'modal-panel-value', lado.clase)}>{lado.valor}</div>
    </div>
  )
}

export function ModalPanel({ izquierda, derecha }: { izquierda: LadoPanel; derecha?: LadoPanel }) {
  return (
    <div className="modal-panel">
      <Lado lado={izquierda} derecha={false} />
      {derecha && <Lado lado={derecha} derecha />}
    </div>
  )
}
