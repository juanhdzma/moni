import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 250

export function usePreview<T>(clave: string | null, cargar: () => Promise<T>): T | null {
  const [res, setRes] = useState<{ clave: string; data: T } | null>(null)
  const cargarRef = useRef(cargar)
  useEffect(() => {
    cargarRef.current = cargar
  })
  useEffect(() => {
    if (clave === null) return
    let vigente = true
    const t = setTimeout(() => {
      cargarRef.current().then(
        (data) => {
          if (vigente) setRes({ clave, data })
        },
        () => undefined,
      )
    }, DEBOUNCE_MS)
    return () => {
      vigente = false
      clearTimeout(t)
    }
  }, [clave])
  return res && res.clave === clave ? res.data : null
}
