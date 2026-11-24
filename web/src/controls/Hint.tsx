import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Hint({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <div id={id} className={cn('mt-1.5 text-xs text-muted-foreground', className)}>
      {children}
    </div>
  )
}
