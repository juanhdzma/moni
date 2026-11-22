import { useEffect, useRef, useState } from 'react'
import { useData } from './DataProvider'

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

export function useVista<T>(clave: string | null, cargar: () => Promise<T>): Vista<T> {
  const { generacion, showBanner } = useData()
  const cargarRef = useRef(cargar)
  const [res, setRes] = useState<Resultado<T> | null>(null)

  useEffect(() => {
    cargarRef.current = cargar
  })

  useEffect(() => {
    if (clave === null) return
    let vigente = true
    cargarRef.current().then(
      (data) => {
        if (vigente) setRes({ clave, data, error: null })
      },
      (err: unknown) => {
        if (!vigente) return
        const mensaje = err instanceof Error ? err.message : String(err)
        setRes((r) => ({ clave, data: r?.clave === clave ? r.data : null, error: mensaje }))
        showBanner(mensaje)
      },
    )
    return () => {
      vigente = false
    }
  }, [clave, generacion, showBanner])

  const vigente = res !== null && res.clave === clave
  return { data: vigente ? res.data : null, loading: clave !== null && !vigente, error: vigente ? res.error : null }
}
