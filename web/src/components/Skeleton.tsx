import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton animate-pulse rounded-md bg-muted', className)} {...props} />
}

export function Cargando({ className }: { className?: string }) {
  return (
    <p role="status" className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
      Cargando...
    </p>
  )
}
