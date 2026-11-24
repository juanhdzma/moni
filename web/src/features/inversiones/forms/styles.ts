import { cn } from '@/lib/utils'

export const rateBtn = (active: boolean) =>
  cn('cursor-pointer px-3 py-2 text-sm font-semibold transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')
