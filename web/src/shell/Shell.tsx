import { useEffect, useState, type ComponentType } from 'react'
import { isStale } from '../lib/format'
import { Dashboard } from '../features/dashboard'
import { Transacciones, openTxForm } from '../features/transacciones'
import { Deudas, openDeudaForm } from '../features/deudas'
import { Inversiones, openInvForm } from '../features/inversiones'
import { Activos, openActivoForm } from '../features/activos'
import { Recurrentes, openRecurrenteForm } from '../features/recurrentes'
import { Settings } from '../features/settings'
import { useData } from './DataProvider'
import { useModal } from './ModalProvider'
import { useOpenerCtx, type OpenerCtx } from './openers'
import { TabBoundary } from './TabBoundary'
import type { TabProps } from './TabContent'

export type TabId = 'dashboard' | 'transacciones' | 'deudas' | 'inversiones' | 'activos' | 'recurrentes' | 'settings'

const TABS: { id: TabId; nav: string; drawer: string; Tab: ComponentType<TabProps> }[] = [
  { id: 'dashboard', nav: 'Dashboard', drawer: 'Dashboard', Tab: Dashboard },
  { id: 'transacciones', nav: 'Transacciones', drawer: 'Movimientos', Tab: Transacciones },
  { id: 'deudas', nav: 'Deudas', drawer: 'Deudas', Tab: Deudas },
  { id: 'inversiones', nav: 'Inversiones', drawer: 'Inversiones', Tab: Inversiones },
  { id: 'activos', nav: 'Activos', drawer: 'Activos', Tab: Activos },
  { id: 'recurrentes', nav: 'Recurrentes', drawer: 'Recurrentes', Tab: Recurrentes },
  { id: 'settings', nav: 'Ajustes', drawer: 'Ajustes', Tab: Settings },
]

export const FAB_ACTIONS: Partial<Record<TabId, (ctx: OpenerCtx) => void>> = {
  transacciones: (ctx) => openTxForm(ctx),
  deudas: (ctx) => openDeudaForm(ctx),
  inversiones: (ctx) => openInvForm(ctx),
  activos: (ctx) => openActivoForm(ctx),
  recurrentes: (ctx) => openRecurrenteForm(ctx),
}

export function Shell() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [drawer, setDrawer] = useState(false)
  const { estado, version, banner, reportRenderFailure } = useData()
  const { closeModal } = useModal()
  const openerCtx = useOpenerCtx()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
        setDrawer(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeModal])

  const goTo = (id: TabId) => {
    setTab(id)
    setDrawer(false)
  }

  const warn: Partial<Record<TabId, boolean>> = {
    activos: estado.activos.some((a) => isStale(a.valor_actualizado_en)),
    inversiones: estado.inversiones.some((i) => i.tipo === 'variable' && isStale(i.valor_actualizado_en)),
  }
  const cls = (base: string, id: TabId) => base + (tab === id ? ' active' : '') + (warn[id] ? ' has-warning' : '')
  const fab = FAB_ACTIONS[tab]

  return (
    <>
      <header className="header">
        <button className="hamburger-btn" id="hamburger-btn" onClick={() => setDrawer(true)} aria-label="Menú">
          ☰
        </button>
        <div className="header-title-mobile">Moni</div>
        <nav className="header-nav" id="header-nav">
          {TABS.map((t) => (
            <button key={t.id} className={cls('nav-btn', t.id)} data-tab={t.id} onClick={() => goTo(t.id)}>
              {t.nav}
            </button>
          ))}
        </nav>
      </header>

      <div
        className={'nav-drawer-overlay' + (drawer ? ' open' : '')}
        id="nav-drawer-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setDrawer(false)
        }}
      >
        <nav className="nav-drawer" id="nav-drawer">
          <div className="nav-drawer-header">
            <span className="nav-drawer-title">Menú</span>
            <button className="icon-btn" onClick={() => setDrawer(false)}>
              ✕
            </button>
          </div>
          {TABS.map((t) => (
            <button key={t.id} className={cls('nav-drawer-item', t.id)} data-tab={t.id} onClick={() => goTo(t.id)}>
              {t.drawer}
            </button>
          ))}
        </nav>
      </div>
      <button
        className="fab"
        id="fab-btn"
        data-tab={tab}
        onClick={() => fab?.(openerCtx)}
        aria-label="Agregar"
        style={{ display: fab ? '' : 'none' }}
      >
        +
      </button>

      <main className="main">
        <div className="error-banner" id="err-banner" style={{ display: banner ? 'block' : 'none' }}>
          {banner}
        </div>
        {TABS.map(({ id, Tab }) => (
          <TabBoundary key={id} name={id} active={tab === id} resetKeys={[estado, version]} onFail={reportRenderFailure}>
            <Tab active={tab === id} />
          </TabBoundary>
        ))}
      </main>
    </>
  )
}
