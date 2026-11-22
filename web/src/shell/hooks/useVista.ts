import { useEffect, useRef, useState } from 'react'
import { errMsg } from '@/lib/format'
import { firmaDeVersiones, TODAS_LAS_ENTIDADES, type Entidad } from '@/shell/invalidacion'
import { useTabActiva } from '@/shell/layout/TabActiva'
import { useData } from '@/shell/providers/DataProvider'

export interface Vista<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface Resultado<T> {
  clave: string
  data: T | null
  error: string | null
}

export function useVista<T>(clave: string | null, cargar: () => Promise<T>, dependeDe: Entidad[] = TODAS_LAS_ENTIDADES): Vista<T> {
  const { versiones, showBanner } = useData()
  const tabActiva = useTabActiva()
  const cargarRef = useRef(cargar)
  const ultimaCargada = useRef<string | null>(null)
  const [res, setRes] = useState<Resultado<T> | null>(null)
  const firma = firmaDeVersiones(versiones, dependeDe)

  useEffect(() => {
    cargarRef.current = cargar
  })

  useEffect(() => {
    if (clave === null || !tabActiva) return
    const pedido = `${clave}|${firma}`
    if (ultimaCargada.current === pedido) return
    let vigente = true
    cargarRef.current().then(
      (data) => {
        if (!vigente) return
        ultimaCargada.current = pedido
        setRes({ clave, data, error: null })
      },
      (err: unknown) => {
        if (!vigente) return
        ultimaCargada.current = null
        const mensaje = errMsg(err)
        setRes((r) => ({ clave, data: r?.clave === clave ? r.data : null, error: mensaje }))
        showBanner(mensaje)
      },
    )
    return () => {
      vigente = false
    }
  }, [clave, firma, tabActiva, showBanner])

  const vigente = res !== null && res.clave === clave
  return { data: vigente ? res.data : null, loading: clave !== null && !vigente, error: vigente ? res.error : null }
}
