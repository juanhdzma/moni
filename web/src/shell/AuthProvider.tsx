import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, setAuthEvents } from '../lib/api'
import { cargarEstadoAuth, cerrarSesion, entrarConClave, type EstadoAuth } from '../lib/auth'
import { loginConPasskey } from '../lib/passkeys'

export type Fase = 'cargando' | 'login' | 'autenticado' | 'sin_configurar' | 'error'

export interface AuthApi {
  fase: Fase
  passkeys: number
  bloqueadaHasta: number | null
  loginReciente: boolean
  entrar: (clave: string) => Promise<void>
  entrarConPasskey: () => Promise<void>
  salir: () => Promise<void>
  recargar: () => Promise<void>
  desbloquear: () => void
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

export function AuthProvider({ children, initialEstado }: Props) {
  const [fase, setFase] = useState<Fase>(initialEstado ? faseDe(initialEstado) : 'cargando')
  const [passkeys, setPasskeys] = useState(initialEstado?.passkeys ?? 0)
  const [bloqueadaHasta, setBloqueadaHasta] = useState<number | null>(null)
  const [loginReciente, setLoginReciente] = useState(false)

  const bloquear = useCallback((segundos: number) => {
    setBloqueadaHasta(Date.now() + segundos * 1000)
    setFase((f) => (f === 'autenticado' ? 'login' : f))
  }, [])

  const recargar = useCallback(async () => {
    try {
      const e = await cargarEstadoAuth()
      setPasskeys(e.passkeys)
      setFase(faseDe(e))
    } catch (err) {
      if (err instanceof ApiError && err.reintentarEnS !== null) {
        bloquear(err.reintentarEnS)
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

  const entrar = useCallback(async (clave: string) => {
    await entrarConClave(clave)
    setLoginReciente(true)
    setFase('autenticado')
  }, [])

  const entrarConPasskey = useCallback(async () => {
    await loginConPasskey()
    setFase('autenticado')
  }, [])

  const salir = useCallback(async () => {
    await cerrarSesion()
    setLoginReciente(false)
    setFase('login')
  }, [])

  const desbloquear = useCallback(() => {
    setBloqueadaHasta(null)
    void recargar()
  }, [recargar])

  const value = useMemo(
    () => ({ fase, passkeys, bloqueadaHasta, loginReciente, entrar, entrarConPasskey, salir, recargar, desbloquear }),
    [fase, passkeys, bloqueadaHasta, loginReciente, entrar, entrarConPasskey, salir, recargar, desbloquear],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
