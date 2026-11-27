import { X } from 'lucide-react'
import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useData } from '@/shell/providers/DataProvider'
import { IconButton } from '@/controls/forms/IconButton'
import { closeAnyOpenPopup, usePopupOutsideClick } from '@/controls/inputs/popups'
import { enfocables, useAtrapaFoco } from '@/controls/forms/useAtrapaFoco'

export interface ModalApi {
  openModal: (title: string, content: ReactNode) => void
  pushModal: (title: string, content: ReactNode) => void
  popModal: () => void
  closeModal: () => void
  setModalStatus: (cls: string, msg: string) => void
  setPendingProxOp: (key: string | null) => void
  pendingOpClave: () => string | null
}

interface Capa {
  id: number
  title: string
  content: ReactNode
  focoPrevio: HTMLElement | null
}

interface Status {
  cls: string
  msg: string
}

const ModalContext = createContext<ModalApi | null>(null)
const StatusContext = createContext<Status>({ cls: '', msg: '' })

const SIN_ESTADO = () => undefined

export const useEstablecerEstado = (): ModalApi['setModalStatus'] => useContext(ModalContext)?.setModalStatus ?? SIN_ESTADO

export function useModal(): ModalApi {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal fuera de ModalProvider')
  return ctx
}

export function useModalStatus(): Status {
  return useContext(StatusContext)
}

class ContentBoundary extends Component<{ onFail: (err: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    this.props.onFail(err)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

const enfocadoActual = () => (document.activeElement instanceof HTMLElement ? document.activeElement : null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [pila, setPila] = useState<Capa[]>([])
  const [status, setStatus] = useState<Status>({ cls: '', msg: '' })
  const dialogRef = useRef<HTMLDivElement>(null)
  const topeRef = useRef<HTMLDivElement>(null)
  const pilaRef = useRef<Capa[]>([])
  const siguienteId = useRef(0)
  const prevFocus = useRef<HTMLElement | null>(null)
  const volverA = useRef<HTMLElement | null>(null)
  const justClosed = useRef<HTMLElement | null>(null)
  const pending = useRef<string | null>(null)
  const { showBanner } = useData()

  usePopupOutsideClick()

  const fijarPila = useCallback((nueva: Capa[]) => {
    pilaRef.current = nueva
    setPila(nueva)
  }, [])

  const nuevaCapa = useCallback((title: string, content: ReactNode): Capa => ({ id: siguienteId.current++, title, content, focoPrevio: enfocadoActual() }), [])

  const openModal = useCallback(
    (title: string, content: ReactNode) => {
      if (pilaRef.current.length === 0) {
        prevFocus.current = justClosed.current ?? enfocadoActual()
        justClosed.current = null
      }
      setStatus({ cls: '', msg: '' })
      fijarPila([nuevaCapa(title, content)])
    },
    [fijarPila, nuevaCapa],
  )

  const pushModal = useCallback(
    (title: string, content: ReactNode) => {
      if (pilaRef.current.length === 0) return openModal(title, content)
      closeAnyOpenPopup()
      fijarPila([...pilaRef.current, nuevaCapa(title, content)])
    },
    [fijarPila, nuevaCapa, openModal],
  )

  const closeModal = useCallback(() => {
    justClosed.current = prevFocus.current
    queueMicrotask(() => {
      justClosed.current = null
    })
    fijarPila([])
    pending.current = null
    closeAnyOpenPopup()
    prevFocus.current?.focus()
    prevFocus.current = null
  }, [fijarPila])

  const popModal = useCallback(() => {
    const actual = pilaRef.current
    if (actual.length <= 1) return closeModal()
    closeAnyOpenPopup()
    volverA.current = actual[actual.length - 1]?.focoPrevio ?? null
    fijarPila(actual.slice(0, -1))
  }, [closeModal, fijarPila])

  const onContentFail = useCallback(
    (err: unknown) => {
      console.error('formulario del modal falló:', err)
      closeModal()
      showBanner('No se pudo abrir el formulario. Mirá la consola.')
    },
    [closeModal, showBanner],
  )

  const setModalStatus = useCallback((cls: string, msg: string) => setStatus({ cls, msg }), [])
  const setPendingProxOp = useCallback((key: string | null) => {
    pending.current = key
  }, [])
  const pendingOpClave = useCallback(() => pending.current, [])

  useEffect(() => {
    if (pila.length === 0) return
    const volver = volverA.current
    volverA.current = null
    if (volver?.isConnected) volver.focus()
    else enfocables(pila.length > 1 ? topeRef.current : dialogRef.current)[0]?.focus()
  }, [pila])

  useAtrapaFoco(dialogRef, pila.length > 0, popModal)

  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) popModal()
  }

  const api = useMemo(
    () => ({ openModal, pushModal, popModal, closeModal, setModalStatus, setPendingProxOp, pendingOpClave }),
    [openModal, pushModal, popModal, closeModal, setModalStatus, setPendingProxOp, pendingOpClave],
  )

  const tope = pila[pila.length - 1]

  return (
    <ModalContext.Provider value={api}>
      <StatusContext.Provider value={status}>
        <div id="modal-overlay" className={'modal-overlay' + (tope ? ' open' : '')} onClick={onBackdrop}>
          <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <h2 className="modal-title" id="modal-title">
                {tope?.title}
              </h2>
              <IconButton label="Cerrar" onClick={popModal}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div id="modal-body">
              {pila.map((capa) => (
                <div key={capa.id} ref={capa === tope ? topeRef : undefined} hidden={capa !== tope}>
                  <ContentBoundary onFail={onContentFail}>{capa.content}</ContentBoundary>
                </div>
              ))}
            </div>
          </div>
        </div>
      </StatusContext.Provider>
      {children}
    </ModalContext.Provider>
  )
}
