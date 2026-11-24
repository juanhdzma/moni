import { cn } from '@/lib/utils'

export function Cargando({ className }: { className?: string }) {
  return (
    <p role="status" className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
      Cargando...
    </p>
  )
}
