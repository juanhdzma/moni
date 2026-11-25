import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  label: string
}

export function IconButton({ label, className, children, ...rest }: Props) {
  return (
    <button type="button" {...rest} className={cn('icon-btn', className)} aria-label={label}>
      {children}
    </button>
  )
}
