import { useEffect, useState, type ComponentType } from 'react'
import { Menu, Plus, TriangleAlert } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
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

type TabId = 'dashboard' | 'transacciones' | 'deudas' | 'inversiones' | 'activos' | 'recurrentes' | 'settings'

const TABS: { id: TabId; nav: string; drawer: string; Tab: ComponentType<TabProps> }[] = [
  { id: 'dashboard', nav: 'Dashboard', drawer: 'Dashboard', Tab: Dashboard },
  { id: 'transacciones', nav: 'Transacciones', drawer: 'Transacciones', Tab: Transacciones },
  { id: 'deudas', nav: 'Deudas', drawer: 'Deudas', Tab: Deudas },
  { id: 'inversiones', nav: 'Inversiones', drawer: 'Inversiones', Tab: Inversiones },
  { id: 'activos', nav: 'Activos', drawer: 'Activos', Tab: Activos },
  { id: 'recurrentes', nav: 'Recurrentes', drawer: 'Recurrentes', Tab: Recurrentes },
  { id: 'settings', nav: 'Ajustes', drawer: 'Ajustes', Tab: Settings },
]

const FAB_ACTIONS: Partial<Record<TabId, (ctx: OpenerCtx) => void>> = {
  transacciones: (ctx) => openTxForm(ctx),
  deudas: (ctx) => openDeudaForm(ctx),
  inversiones: (ctx) => openInvForm(ctx),
  activos: (ctx) => openActivoForm(ctx),
  recurrentes: (ctx) => openRecurrenteForm(ctx),
}

function AvisoPrecio() {
  return (
    <>
      <span aria-hidden="true" className="ml-1.5 inline-block size-1.5 -translate-y-2 rounded-full bg-alerta" />
      <span className="sr-only"> (precios sin actualizar)</span>
    </>
  )
}

export function Shell() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [drawer, setDrawer] = useState(false)
  const { estado, version, banner, reportRenderFailure } = useData()
  const { closeModal } = useModal()
  const openerCtx = useOpenerCtx()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
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
  const fab = FAB_ACTIONS[tab]

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-ink bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1280px] items-stretch gap-6 px-4 md:px-8">
          <Sheet open={drawer} onOpenChange={setDrawer}>
            <SheetTrigger asChild>
              <button type="button" aria-label="Menú" className="-ml-2 grid w-10 cursor-pointer place-items-center self-center rounded-sm hover:bg-wash lg:hidden">
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[78%] max-w-72 gap-0 border-r border-ink bg-paper p-0" id="nav-drawer">
              <div className="flex h-14 items-center border-b border-ink px-5 pt-[env(safe-area-inset-top)]">
                <SheetTitle className="text-lg font-semibold">Moni</SheetTitle>
                <SheetDescription className="sr-only">Secciones de la app</SheetDescription>
              </div>
              <nav aria-label="Secciones" className="flex flex-col py-2">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    data-tab={t.id}
                    aria-current={tab === t.id ? 'page' : undefined}
                    onClick={() => goTo(t.id)}
                    className={cn(
                      'nav-drawer-item flex cursor-pointer items-center border-l-[3px] px-5 py-3 text-left text-[16px] transition-colors hover:bg-wash',
                      tab === t.id ? 'active border-ink font-semibold text-ink' : 'border-transparent text-ink-2',
                      warn[t.id] && 'has-warning',
                    )}
                  >
                    {t.drawer}
                    {warn[t.id] && <AvisoPrecio />}
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <button type="button" onClick={() => goTo('dashboard')} className="flex cursor-pointer items-center gap-2 self-center text-[19px] font-semibold tracking-tight">
            <img src="assets/icons/moni.svg" alt="" className="size-6" />
            Moni
          </button>

          <nav id="header-nav" aria-label="Secciones" className="ml-auto hidden items-stretch gap-1 lg:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                data-tab={t.id}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => goTo(t.id)}
                className={cn(
                  'nav-btn relative -mb-px flex cursor-pointer items-center border-b-[3px] px-3 text-[15px] transition-colors',
                  tab === t.id ? 'active border-ink font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink',
                  warn[t.id] && 'has-warning',
                )}
              >
                {t.nav}
                {warn[t.id] && <AvisoPrecio />}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <button
        type="button"
        id="fab-btn"
        data-tab={tab}
        onClick={() => fab?.(openerCtx)}
        aria-label="Agregar"
        style={{ display: fab ? '' : 'none' }}
        className="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-30 grid size-14 cursor-pointer place-items-center rounded-full bg-ink text-paper transition-transform hover:scale-105 active:scale-95 md:hidden"
      >
        <Plus className="size-6" strokeWidth={2.25} />
      </button>

      <main className="mx-auto max-w-[1280px] px-4 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pt-12">
        <div
          id="err-banner"
          role="alert"
          style={{ display: banner ? 'flex' : 'none' }}
          className="mb-8 items-start gap-3 border-y-2 border-deudas py-3 text-[15px] text-ink"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-deudas" />
          <span>{banner}</span>
        </div>
        {TABS.map(({ id, Tab }) => (
          <TabBoundary key={id} name={id} active={tab === id} resetKeys={[estado, version]} onFail={reportRenderFailure}>
            <Tab active={tab === id} />
          </TabBoundary>
        ))}
      </main>
    </div>
  )
}
