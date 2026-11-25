import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useModalStatus } from '@/shell/providers/ModalProvider'

export function StatusMessage({ cls, msg, id, className }: { cls: string; msg: string; id?: string; className?: string }) {
  const Icon = cls === 'err' ? CircleAlert : cls === 'ok' ? CircleCheck : null
  return (
    <div className={cn('form-status flex items-start gap-1.5', cls, className)} id={id} role={cls === 'err' ? 'alert' : 'status'}>
      {Icon && msg && <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
      {msg}
    </div>
  )
}

export function FormStatus() {
  const { cls, msg } = useModalStatus()
  return <StatusMessage cls={cls} msg={msg} id="m-status" className="mt-3" />
}

export function Hint({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <div id={id} className={cn('mt-1.5 text-xs text-muted-foreground', className)}>
      {children}
    </div>
  )
}
