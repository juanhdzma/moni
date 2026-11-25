import { useEffect, useState, type FormEvent } from 'react'
import { ScanFace } from 'lucide-react'
import { Cargando } from '@/components/Cargando'
import { Campo } from '@/controls/Campo'
import { ApiError } from '@/lib/api'
import { esCancelacion, passkeysDisponibles } from '@/lib/seguridad/passkeys'
import { useAuth } from '@/shell/providers/AuthProvider'

function mensajeDeLogin(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return ''
    if (err.status === 401 || err.status === 503) return err.message
  }
  return 'No se pudo iniciar sesión. Probá de nuevo.'
}

export function Login() {
  const { fase, recargar } = useAuth()

  if (fase === 'cargando') {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-4" aria-busy="true">
        <Cargando />
      </main>
    )
  }

  if (fase === 'error') {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-4">
        <div className="w-full max-w-sm space-y-3 text-center">
          <p className="text-sm text-muted-foreground" role="alert">No se pudo conectar con el servidor.</p>
          <button type="button" className="btn btn-dim" onClick={() => void recargar()}>
            Reintentar
          </button>
        </div>
      </main>
    )
  }

  if (fase === 'sin_configurar') {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-4">
        <p className="max-w-sm text-center text-sm text-muted-foreground" role="alert">
          Autenticación sin configurar. Definí MONI_PASSWORD_HASH en el servidor.
        </p>
      </main>
    )
  }

  return <Formulario />
}

function Formulario() {
  const { tienePasskeys, textoBloqueo, entrar, entrarConPasskey } = useAuth()
  const [clave, setClave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [passkey, setPasskey] = useState(false)

  useEffect(() => {
    if (!tienePasskeys) return
    let vigente = true
    void passkeysDisponibles().then((ok) => {
      if (vigente) setPasskey(ok)
    })
    return () => {
      vigente = false
    }
  }, [tienePasskeys])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!clave || enviando) return
    setEnviando(true)
    setError('')
    try {
      await entrar(clave)
    } catch (err) {
      setError(mensajeDeLogin(err))
      setClave('')
    } finally {
      setEnviando(false)
    }
  }

  const conPasskey = async () => {
    if (enviando) return
    setEnviando(true)
    setError('')
    try {
      await entrarConPasskey()
    } catch (err) {
      if (!esCancelacion(err)) setError(err instanceof ApiError ? mensajeDeLogin(err) : 'No se pudo verificar la passkey')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <form className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 text-card-foreground" onSubmit={(e) => void enviar(e)}>
        <h1 className="text-lg font-semibold">Moni</h1>
        {textoBloqueo && (
          <p className="text-sm text-deudas" role="alert">
            {textoBloqueo}
          </p>
        )}
        <Campo id="login-clave" label="Clave">
          <input
            className="form-input"
            id="login-clave"
            type="password"
            autoComplete="current-password"
            maxLength={256}
            autoFocus
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </Campo>
        {error && !textoBloqueo && (
          <p className="text-sm text-deudas" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-accent w-full" disabled={!clave || enviando}>
          Entrar
        </button>
        {passkey && (
          <button type="button" className="btn btn-dim flex w-full items-center justify-center gap-2" disabled={enviando} onClick={() => void conPasskey()}>
            <ScanFace className="size-4" aria-hidden="true" />
            Entrar con passkey
          </button>
        )}
      </form>
    </main>
  )
}
export { ActivarDispositivo } from './ActivarDispositivo'
