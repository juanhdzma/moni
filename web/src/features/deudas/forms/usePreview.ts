import { useEffect, useRef, useState } from 'react'

export function usePreview<T>(activo: boolean, clave: string, pedir: () => Promise<T>): T | null {
  const [res, setRes] = useState<{ clave: string; data: T } | null>(null)
  const pedirRef = useRef(pedir)
  useEffect(() => {
    pedirRef.current = pedir
  })
  useEffect(() => {
    if (!activo) return
    let vigente = true
    pedirRef.current().then(
      (data) => {
        if (vigente) setRes({ clave, data })
      },
      () => {
        if (vigente) setRes(null)
      },
    )
    return () => {
      vigente = false
    }
  }, [activo, clave])
  return activo && res?.clave === clave ? res.data : null
}
