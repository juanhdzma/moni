import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { skipOp } from '../lib/proximasOps'
import { useData } from './DataProvider'
import { closeAnyOpenPopup, usePopupOutsideClick } from './popups'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalApi {
  openModal: (title: string, content: ReactNode) => void
  closeModal: () => void
  setModalStatus: (cls: string, msg: string) => void
  setPendingProxOp: (key: string | null) => void
  resolvePendingProxOp: () => void
}

interface ModalState {
  title: string
  content: ReactNode
}

interface Status {
  cls: string
  msg: string
}

const ModalContext = createContext<ModalApi | null>(null)
const StatusContext = createContext<Status>({ cls: '', msg: '' })

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

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null)
  const [status, setStatus] = useState<Status>({ cls: '', msg: '' })
  const overlayRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)
  const isOpen = useRef(false)
  const justClosed = useRef<HTMLElement | null>(null)
  const pending = useRef<string | null>(null)
  const [boundaryKey, setBoundaryKey] = useState(0)
  const { showBanner } = useData()

  usePopupOutsideClick()

  const focusables = useCallback(
    () =>
      [...(overlayRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter(
        (el) => el.offsetParent !== null && el.getAttribute('tabindex') !== '-1',
      ),
    [],
  )

  const openModal = useCallback((title: string, content: ReactNode) => {
    if (!isOpen.current) {
      prevFocus.current = justClosed.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
      justClosed.current = null
      isOpen.current = true
    }
    setStatus({ cls: '', msg: '' })
    setModal({ title, content })
  }, [])

  const closeModal = useCallback(() => {
    isOpen.current = false
    justClosed.current = prevFocus.current
    queueMicrotask(() => {
      justClosed.current = null
    })
    setModal(null)
    pending.current = null
    closeAnyOpenPopup()
    prevFocus.current?.focus()
    prevFocus.current = null
  }, [])

  const onContentFail = useCallback(
    (err: unknown) => {
      console.error('formulario del modal falló:', err)
      closeModal()
      setBoundaryKey((k) => k + 1)
      showBanner('No se pudo abrir el formulario. Mirá la consola.')
    },
    [closeModal, showBanner],
  )

  const setModalStatus = useCallback((cls: string, msg: string) => setStatus({ cls, msg }), [])
  const setPendingProxOp = useCallback((key: string | null) => {
    pending.current = key
  }, [])
  const resolvePendingProxOp = useCallback(() => {
    if (!pending.current) return
    skipOp(pending.current)
    pending.current = null
  }, [])

  useEffect(() => {
    if (modal) focusables()[0]?.focus()
  }, [modal, focusables])

  const trapFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const list = focusables()
    const primero = list[0]
    const ultimo = list[list.length - 1]
    if (!primero || !ultimo) return
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primero.focus()
    }
  }

  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeModal()
  }

  const api = useMemo(
    () => ({ openModal, closeModal, setModalStatus, setPendingProxOp, resolvePendingProxOp }),
    [openModal, closeModal, setModalStatus, setPendingProxOp, resolvePendingProxOp],
  )

  return (
    <ModalContext.Provider value={api}>
      <StatusContext.Provider value={status}>
        <div
          id="modal-overlay"
          ref={overlayRef}
          className={'modal-overlay' + (modal ? ' open' : '')}
          onClick={onBackdrop}
          onKeyDown={modal ? trapFocus : undefined}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <h2 className="modal-title" id="modal-title">
                {modal?.title}
              </h2>
              <button className="icon-btn" onClick={closeModal} aria-label="Cerrar" style={{ fontSize: 16, lineHeight: 1 }}>
                ✕
              </button>
            </div>
            <div id="modal-body">
              <ContentBoundary key={boundaryKey} onFail={onContentFail}>
                {modal?.content}
              </ContentBoundary>
            </div>
          </div>
        </div>
      </StatusContext.Provider>
      {children}
    </ModalContext.Provider>
  )
}
