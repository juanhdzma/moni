import { useEffect, useRef, useState } from 'react'
import { ScanFace } from 'lucide-react'
import {
  dispositivoTienePasskey,
  esCancelacion,
  marcarOfertaMostrada,
  nombreDeDispositivo,
  ofertaYaMostrada,
  passkeysDisponibles,
  registrarPasskey,
} from '../../lib/seguridad/passkeys'
import { useAuth } from '@/shell/providers/AuthProvider'

export function OfertaPasskey() {
  const { loginReciente } = useAuth()
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const activarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!loginReciente || ofertaYaMostrada() || dispositivoTienePasskey()) return
    let vigente = true
    void passkeysDisponibles().then((ok) => {
      if (!vigente) return
      if (ok) setVisible(true)
      else marcarOfertaMostrada()
    })
    return () => {
      vigente = false
    }
  }, [loginReciente])

  useEffect(() => {
    if (visible) activarRef.current?.focus()
  }, [visible])

  if (!visible) return null

  const descartar = () => {
    marcarOfertaMostrada()
    setVisible(false)
  }

  const activar = async () => {
    setEnviando(true)
    setError('')
    try {
      await registrarPasskey(nombreDeDispositivo())
      descartar()
    } catch (err) {
      if (!esCancelacion(err)) {
        setError('No se pudo activar la passkey. Podés hacerlo desde Ajustes.')
        marcarOfertaMostrada()
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div role="dialog" aria-label="Activar passkey" onKeyDown={(e) => e.key === 'Escape' && descartar()} className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm space-y-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ScanFace className="size-4" aria-hidden="true" />
        Entrar con passkey
      </div>
      <p className="text-sm text-muted-foreground">Activalo en este dispositivo para entrar sin escribir la clave.</p>
      {error && (
        <p className="text-sm text-deudas" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button ref={activarRef} type="button" className="btn btn-accent btn-sm" disabled={enviando} onClick={() => void activar()}>
          Activar
        </button>
        <button type="button" className="btn btn-dim btn-sm" onClick={descartar}>
          Ahora no
        </button>
      </div>
    </div>
  )
}
