import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadAll } from '../lib/api'
import type { Estado } from '../types'

export const ESTADO_VACIO: Estado = { transacciones: [], deudas: [], inversiones: [], activos: [], recurrentes: [] }

export interface DataApi {
  estado: Estado
  loaded: boolean
  loadOk: boolean
  version: number
  reload: () => Promise<void>
  refresh: () => void
  banner: string | null
  showBanner: (msg: string) => void
  hideBanner: () => void
  reportRenderFailure: (name: string) => void
}

const DataContext = createContext<DataApi | null>(null)

export function useData(): DataApi {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData fuera de DataProvider')
  return ctx
}

interface Props {
  children: ReactNode
  initialEstado?: Estado
  initialLoaded?: boolean
}

export function DataProvider({ children, initialEstado, initialLoaded }: Props) {
  const [loaded, setLoaded] = useState(initialLoaded ?? initialEstado !== undefined)
  const [loadOk, setLoadOk] = useState(loaded)
  const [estado, setEstado] = useState<Estado>(initialEstado ?? ESTADO_VACIO)
  const [version, setVersion] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)
  const failed = useRef(new Set<string>())
  const lastRequest = useRef(0)

  const showBanner = useCallback((msg: string) => setBanner(msg), [])
  const hideBanner = useCallback(() => setBanner(null), [])

  const applyData = useCallback((data: Estado) => {
    failed.current.clear()
    setEstado(data)
    setLoaded(true)
    setLoadOk(true)
    setBanner(null)
  }, [])

  const onLoadError = useCallback(
    (err: unknown) => {
      setLoaded(true)
      setLoadOk(false)
      showBanner(err instanceof Error ? err.message : String(err))
    },
    [showBanner],
  )

  const reload = useCallback(() => {
    const id = ++lastRequest.current
    return loadAll().then(
      (data) => {
        if (id === lastRequest.current) applyData(data)
      },
      (err: unknown) => {
        if (id === lastRequest.current) onLoadError(err)
      },
    )
  }, [applyData, onLoadError])

  const refresh = useCallback(() => {
    failed.current.clear()
    setVersion((v) => v + 1)
  }, [])

  const reportRenderFailure = useCallback(
    (name: string) => {
      failed.current.add(name)
      showBanner(`No se pudo dibujar: ${[...failed.current].join(', ')}. Mirá la consola.`)
    },
    [showBanner],
  )

  useEffect(() => {
    if (!initialEstado) void reload()
  }, [initialEstado, reload])

  const value = useMemo(
    () => ({ estado, loaded, loadOk, version, reload, refresh, banner, showBanner, hideBanner, reportRenderFailure }),
    [estado, loaded, loadOk, version, reload, refresh, banner, showBanner, hideBanner, reportRenderFailure],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
