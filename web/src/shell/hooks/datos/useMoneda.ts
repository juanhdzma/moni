import { useMemo } from 'react'
import { formatearCop, formatearCopCorto } from '@/lib/format'
import { useData } from '@/shell/providers/DataProvider'

export function useMoneda() {
  const simbolo = useData().estado.ajustes.moneda_simbolo
  return useMemo(
    () => ({
      simbolo,
      cop: (n: number | null | undefined) => formatearCop(n, simbolo),
      copShort: (n: number) => formatearCopCorto(n, simbolo),
    }),
    [simbolo],
  )
}
