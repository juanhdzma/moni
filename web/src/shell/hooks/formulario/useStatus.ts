import { useCallback, useMemo, useState } from 'react'
import { errMsg } from '@/lib/format'

type ClaseEstado = '' | 'ok' | 'err'

export function useStatus() {
  const [status, setStatus] = useState<{ cls: ClaseEstado; msg: string }>({ cls: '', msg: '' })

  const info = useCallback((msg: string) => setStatus({ cls: '', msg }), [])
  const ok = useCallback((msg: string) => setStatus({ cls: 'ok', msg }), [])
  const err = useCallback((error: unknown) => setStatus({ cls: 'err', msg: errMsg(error) }), [])
  const limpiar = useCallback(() => setStatus({ cls: '', msg: '' }), [])

  return useMemo(() => ({ ...status, info, ok, err, limpiar }), [status, info, ok, err, limpiar])
}
