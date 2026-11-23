import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cargarBootstrap } from '@/lib/api'
import { errMsg, setCurrencySymbol } from '@/lib/format'
import { afectaAlBootstrap, subirVersiones, TODAS_LAS_ENTIDADES, VERSIONES_INICIALES, type Entidad, type Versiones } from '@/shell/invalidacion'
import type { Estado } from '@/types'

export const ESTADO_VACIO: Estado = {
  hoy: '',
  ahora: '',
  ajustes: { moneda_simbolo: '$' },
  categorias: { ingreso: [], gasto: [], transfer: [] },
  alertas: { activos: false, inversiones: false },
  desactualizado: { texto: '' },
}

export interface DataApi {
  estado: Estado
  loaded: boolean
  versiones: Versiones
  reload: (afectadas?: Entidad[]) => Promise<void>
  banner: string | null
  showBanner: (msg: string) => void
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
  const [estado, setEstado] = useState<Estado>(initialEstado ?? ESTADO_VACIO)
  const [versiones, setVersiones] = useState<Versiones>(VERSIONES_INICIALES)
  const [banner, setBanner] = useState<string | null>(null)
  const failed = useRef(new Set<string>())
  const lastRequest = useRef(0)

  const showBanner = useCallback((msg: string) => setBanner(msg), [])

  const cargarEstado = useCallback(() => {
    const id = ++lastRequest.current
    return cargarBootstrap().then(
      (data) => {
        if (id !== lastRequest.current) return
        failed.current.clear()
        setEstado(data)
        setLoaded(true)
        setBanner(null)
      },
      (err: unknown) => {
        if (id !== lastRequest.current) return
        setLoaded(true)
        showBanner(errMsg(err))
      },
    )
  }, [showBanner])

  const reload = useCallback(
    (afectadas: Entidad[] = TODAS_LAS_ENTIDADES) => {
      setVersiones((v) => subirVersiones(v, afectadas))
      return afectaAlBootstrap(afectadas) ? cargarEstado() : Promise.resolve()
    },
    [cargarEstado],
  )

  const reportRenderFailure = useCallback(
    (name: string) => {
      failed.current.add(name)
      showBanner(`No se pudo dibujar: ${[...failed.current].join(', ')}. Mirá la consola.`)
    },
    [showBanner],
  )

  useEffect(() => {
    if (initialEstado) return
    void cargarEstado()
  }, [initialEstado, cargarEstado])

  setCurrencySymbol(estado.ajustes.moneda_simbolo)

  const value = useMemo(
    () => ({ estado, loaded, versiones, reload, banner, showBanner, reportRenderFailure }),
    [estado, loaded, versiones, reload, banner, showBanner, reportRenderFailure],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
