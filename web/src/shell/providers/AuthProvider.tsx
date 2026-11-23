import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, setAuthEvents } from '@/lib/api'
import { cargarEstadoAuth, cerrarSesion, entrarConClave, type EstadoAuth } from '@/lib/seguridad/auth'
import { loginConPasskey } from '@/lib/seguridad/passkeys'

export type Fase = 'cargando' | 'login' | 'autenticado' | 'sin_configurar' | 'error'

export interface AuthApi {
  fase: Fase
  passkeys: number
  textoBloqueo: string | null
  loginReciente: boolean
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
  const [passkeys, setPasskeys] = useState(initialEstado?.passkeys ?? 0)
  const [textoBloqueo, setTextoBloqueo] = useState<string | null>(null)
  const [loginReciente, setLoginReciente] = useState(false)

  const bloquear = useCallback((texto: string) => {
    setTextoBloqueo(texto)
    setFase((f) => (f === 'autenticado' ? 'login' : f))
  }, [])

  const recargar = useCallback(async () => {
    try {
      const e = await cargarEstadoAuth()
      setPasskeys(e.passkeys)
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
        setLoginReciente(false)
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
      setLoginReciente(true)
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
    setLoginReciente(false)
    setFase('login')
  }, [])

  const value = useMemo(
    () => ({ fase, passkeys, textoBloqueo, loginReciente, entrar, entrarConPasskey, salir, recargar }),
    [fase, passkeys, textoBloqueo, loginReciente, entrar, entrarConPasskey, salir, recargar],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
