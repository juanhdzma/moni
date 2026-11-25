import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, ScanFace } from 'lucide-react'
import { Campo } from '@/controls/Campo'
import { useAtrapaFoco } from '@/controls/useAtrapaFoco'
import { ApiError } from '@/lib/api'
import {
  dispositivoTienePasskey,
  esCancelacion,
  marcarOfertaMostrada,
  nombreDeDispositivo,
  ofertaYaMostrada,
  passkeysDisponibles,
  registrarPasskey,
} from '@/lib/seguridad/passkeys'
import { activarPush, pushSoportado, suscripcionActual } from '@/lib/seguridad/push'

type Pendiente = 'passkey' | 'push'

async function pendientes(): Promise<Pendiente[]> {
  const lista: Pendiente[] = []
  if (!dispositivoTienePasskey() && (await passkeysDisponibles())) lista.push('passkey')
  if (pushSoportado() && Notification.permission !== 'denied' && !(await suscripcionActual())) lista.push('push')
  return lista
}

const TEXTOS: Record<Pendiente, { titulo: string; detalle: string; boton: string; Icono: typeof Bell }> = {
  passkey: { titulo: 'Entrar con passkey', detalle: 'Entrá con Face ID o huella, sin escribir la clave.', boton: 'Activar passkey', Icono: ScanFace },
  push: { titulo: 'Notificaciones', detalle: 'Avisos de tus cuotas y movimientos, aunque la app esté cerrada.', boton: 'Activar notificaciones', Icono: Bell },
}

export function ActivarDispositivo() {
  const [faltan, setFaltan] = useState<Pendiente[]>([])
  const [oculto, setOculto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [clave, setClave] = useState('')
  const dialogoRef = useRef<HTMLDivElement>(null)
  const ocultar = useCallback(() => setOculto(true), [])
  const visible = !oculto && faltan.length > 0
  useAtrapaFoco(dialogoRef, visible, ocultar)

  useEffect(() => {
    if (ofertaYaMostrada()) return
    let vigente = true
    void pendientes().then((lista) => {
      if (!vigente || lista.length === 0) return
      marcarOfertaMostrada()
      setFaltan(lista)
    })
    return () => {
      vigente = false
    }
  }, [])

  useEffect(() => {
    dialogoRef.current?.querySelector<HTMLElement>('input, button:not([disabled])')?.focus()
  }, [faltan.length])

  if (!visible) return null

  const activar = async (cual: Pendiente) => {
    setEnviando(true)
    setError('')
    try {
      if (cual === 'passkey') await registrarPasskey(nombreDeDispositivo(), clave)
      else await activarPush()
      setFaltan((f) => f.filter((x) => x !== cual))
    } catch (err) {
      if (!esCancelacion(err)) setError(err instanceof ApiError && err.status === 403 ? err.message : 'No se pudo activar. Podés hacerlo desde Ajustes.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-label="Activar en este dispositivo"
        className="w-full max-w-md space-y-5 rounded-3xl border bg-card p-6 text-card-foreground shadow-xl"
      >
        <h2 className="text-2xl font-semibold">Activá Moni en este dispositivo</h2>
        <div className="space-y-4">
          {faltan.map((cual) => {
            const { titulo, detalle, boton, Icono } = TEXTOS[cual]
            return (
              <div key={cual} className="space-y-3 rounded-2xl border p-4">
                <div className="flex items-center gap-3">
                  <Icono className="size-10 shrink-0" aria-hidden="true" />
                  <div>
                    <div className="text-lg font-medium">{titulo}</div>
                    <p className="text-sm text-muted-foreground">{detalle}</p>
                  </div>
                </div>
                {cual === 'passkey' && (
                  <Campo id="activar-clave" label="Clave para confirmar" className="mb-0">
                    <input
                      className="form-input"
                      type="password"
                      id="activar-clave"
                      autoComplete="current-password"
                      maxLength={256}
                      value={clave}
                      onChange={(e) => setClave(e.target.value)}
                    />
                  </Campo>
                )}
                <button
                  type="button"
                  className="btn btn-accent w-full py-4 text-base"
                  disabled={enviando || (cual === 'passkey' && !clave)}
                  onClick={() => void activar(cual)}
                >
                  {boton}
                </button>
              </div>
            )
          })}
        </div>
        {error && (
          <p className="text-sm text-deudas" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-dim w-full" onClick={() => setOculto(true)}>
          Ahora no
        </button>
      </div>
    </div>
  )
}
