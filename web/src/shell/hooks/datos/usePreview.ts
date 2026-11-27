import { useEffect, useRef, useState } from 'react'
import { errMsg } from '@/lib/format'
import { useEstablecerEstado } from '@/shell/providers/ModalProvider'

const DEBOUNCE_MS = 250

export function usePreview<T>(clave: string | null, cargar: () => Promise<T>): T | null {
  const [res, setRes] = useState<{ clave: string; data: T } | null>(null)
  const setModalStatus = useEstablecerEstado()
  const cargarRef = useRef(cargar)
  const conError = useRef(false)
  useEffect(() => {
    cargarRef.current = cargar
  })
  useEffect(() => {
    if (clave === null) return
    let vigente = true
    const t = setTimeout(() => {
      cargarRef.current().then(
        (data) => {
          if (!vigente) return
          if (conError.current) setModalStatus('', '')
          conError.current = false
          setRes({ clave, data })
        },
        (err: unknown) => {
          if (!vigente) return
          conError.current = true
          setModalStatus('err', errMsg(err))
        },
      )
    }, DEBOUNCE_MS)
    return () => {
      vigente = false
      clearTimeout(t)
    }
  }, [clave, setModalStatus])
  return res && res.clave === clave ? res.data : null
}
