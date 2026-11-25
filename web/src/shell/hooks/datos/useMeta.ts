import { useEffect, useState } from 'react'
import { cargarMeta } from '@/lib/api'
import type { Meta } from '@/types'

let resuelta: Meta | null = null
let pendiente: Promise<Meta> | null = null

export function cargarMetaUnaVez(): Promise<Meta> {
  pendiente ??= cargarMeta().then(
    (meta) => (resuelta = meta),
    (err: unknown) => {
      pendiente = null
      throw err
    },
  )
  return pendiente
}

export function useMeta(): Meta | null {
  const [meta, setMeta] = useState<Meta | null>(resuelta)
  useEffect(() => {
    let vigente = true
    cargarMetaUnaVez().then(
      (m) => vigente && setMeta(m),
      () => undefined,
    )
    return () => {
      vigente = false
    }
  }, [])
  return meta
}
