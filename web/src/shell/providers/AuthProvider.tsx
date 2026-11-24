import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, setAuthEvents } from '@/lib/api'
import { cargarEstadoAuth, cerrarSesion, entrarConClave, type EstadoAuth } from '@/lib/seguridad/auth'
import { loginConPasskey } from '@/lib/seguridad/passkeys'

export type Fase = 'cargando' | 'login' | 'autenticado' | 'sin_configurar' | 'error'

interface AuthApi {
  fase: Fase
  tienePasskeys: boolean
  textoBloqueo: string | null
  entrar: (clave: string) => Promise<void>
  entrarConPasskey: () => Promise<void>
  salir: () => Promise<void>
  recargar: () => Promise<void>
}

const AuthContext = createContext<AuthApi | null>(null)

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}

interface Props {
  children: ReactNode
  initialEstado?: EstadoAuth
}

const faseDe = (e: EstadoAuth): Fase => (!e.configurado ? 'sin_configurar' : e.autenticado ? 'autenticado' : 'login')

const esBloqueo = (err: unknown): err is ApiError => err instanceof ApiError && err.reintentarEnS !== null

export function AuthProvider({ children, initialEstado }: Props) {
  const [fase, setFase] = useState<Fase>(initialEstado ? faseDe(initialEstado) : 'cargando')
  const [tienePasskeys, setTienePasskeys] = useState(initialEstado?.tiene_passkeys ?? false)
  const [textoBloqueo, setTextoBloqueo] = useState<string | null>(null)

  const bloquear = useCallback((texto: string) => {
    setTextoBloqueo(texto)
    setFase((f) => (f === 'autenticado' ? 'login' : f))
  }, [])

  const recargar = useCallback(async () => {
    try {
      const e = await cargarEstadoAuth()
      setTienePasskeys(e.tiene_passkeys)
      setFase(faseDe(e))
    } catch (err) {
      if (esBloqueo(err)) {
        bloquear(err.textoBloqueo ?? err.message)
        setFase('login')
      } else {
        setFase('error')
      }
    }
  }, [bloquear])

  useEffect(() => {
    setAuthEvents({
      noAutenticado: () => {
        setFase((f) => (f === 'autenticado' ? 'login' : f))
      },
      bloqueada: bloquear,
    })
    return () => setAuthEvents(null)
  }, [bloquear])

  useEffect(() => {
    if (initialEstado) return
    void Promise.resolve().then(recargar)
  }, [initialEstado, recargar])

  const intentar = useCallback(async (intento: () => Promise<unknown>) => {
    try {
      await intento()
    } catch (err) {
      if (!esBloqueo(err)) setTextoBloqueo(null)
      throw err
    }
    setTextoBloqueo(null)
  }, [])

  const entrar = useCallback(
    async (clave: string) => {
      await intentar(() => entrarConClave(clave))
      setFase('autenticado')
    },
    [intentar],
  )

  const entrarConPasskey = useCallback(async () => {
    await intentar(loginConPasskey)
    setFase('autenticado')
  }, [intentar])

  const salir = useCallback(async () => {
    await cerrarSesion()
    setFase('login')
  }, [])

  const value = useMemo(
    () => ({ fase, tienePasskeys, textoBloqueo, entrar, entrarConPasskey, salir, recargar }),
    [fase, tienePasskeys, textoBloqueo, entrar, entrarConPasskey, salir, recargar],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
