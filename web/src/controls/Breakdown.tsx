import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Breakdown({ id, visible, children }: { id: string; visible: boolean; children: ReactNode }) {
  return (
    <div id={id} className={cn('breakdown', visible && 'visible')}>
      {children}
    </div>
  )
}

export function BreakdownRow({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="breakdown-row">
      <span className="breakdown-label">{label}</span>
      <span className="breakdown-value" id={id}>
        {children}
      </span>
    </div>
  )
}
