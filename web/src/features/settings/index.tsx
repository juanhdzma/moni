import { useState, type ChangeEvent } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { Panel } from '@/components/panel'
import { FormStatus } from '../../controls/FormStatus'
import { Select } from '../../controls/Select'
import { apiFetch } from '../../lib/api'
import { isSystemCategory } from '../../lib/config'
import { getCurrencySymbol, setCurrencySymbol, todayStr } from '../../lib/format'
import { loadSkippedOps, restoreAllOps, restoreOp } from '../../lib/proximasOps'
import { useCategorias } from '../../shell/CategoriasProvider'
import { useData } from '../../shell/DataProvider'
import { useModal } from '../../shell/ModalProvider'
import { TabContent, type TabProps } from '../../shell/TabContent'
import type { TipoTx } from '../../types'

const CURRENCY_OPTIONS = [
  { value: '$', label: 'Peso colombiano ($)' },
  { value: 'US$', label: 'Dólar (US$)' },
  { value: '€', label: 'Euro (€)' },
  { value: 'MX$', label: 'Peso mexicano (MX$)' },
  { value: '£', label: 'Libra esterlina (£)' },
]

const CAT_TIPO_LABELS: [TipoTx, string][] = [
  ['ingreso', 'Ingresos'],
  ['gasto', 'Gastos'],
  ['transfer', 'Transferencias'],
]

const DOT: Record<TipoTx, string> = { ingreso: 'bg-inversiones', gasto: 'bg-deudas', transfer: 'bg-muted-foreground' }

const HINT = 'mt-2 text-xs text-muted-foreground'

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

function CategoriaGroup({ tipo, label }: { tipo: TipoTx; label: string }) {
  const { categorias, addCategoria, removeCategoria } = useCategorias()
  const [nuevo, setNuevo] = useState('')
  const cats = categorias[tipo] || []

  const agregar = () => {
    const nombre = nuevo.trim()
    if (!nombre) return
    addCategoria(tipo, nombre)
    setNuevo('')
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className={`size-2 rounded-full ${DOT[tipo]}`}></span>
        {label}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs" key={c}>
            {c}
            {isSystemCategory(tipo, c) ? null : (
              <button type="button" className="rounded-full p-0.5 text-muted-foreground hover:text-foreground" onClick={() => removeCategoria(tipo, c)} aria-label={`Eliminar ${c}`}>
                <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        {!cats.length && <span className="text-xs text-muted-foreground">Sin categorías todavía</span>}
      </div>
      <div className="flex gap-2">
        <input
          className="form-input"
          type="text"
          maxLength={25}
          id={`settings-new-cat-${tipo}`}
          placeholder="Nueva categoría"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') agregar()
          }}
        />
        <button type="button" className="btn btn-dim" onClick={agregar}>
          Agregar
        </button>
      </div>
    </div>
  )
}

function Skipped() {
  const { refresh } = useData()
  const set = loadSkippedOps()
  if (!set.size) return <p className="text-sm text-muted-foreground">Ninguna operación oculta.</p>
  return (
    <>
      <ul className="divide-y">
        {[...set].map((key) => (
          <li className="flex items-center justify-between gap-3 py-2" key={key}>
            <span className="break-all font-mono text-xs text-muted-foreground">{key}</span>
            <button
              type="button"
              className="btn btn-dim btn-sm"
              onClick={() => {
                restoreOp(key)
                refresh()
              }}
            >
              Restaurar
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-dim btn-sm mt-3"
        onClick={() => {
          restoreAllOps()
          refresh()
        }}
      >
        Restaurar todas
      </button>
    </>
  )
}

function Currency() {
  const { refresh } = useData()
  return (
    <div>
      <label className="form-label" htmlFor="settings-currency-select">Símbolo mostrado junto a los montos</label>
      <Select
        compact
        id="settings-currency-select"
        value={getCurrencySymbol()}
        options={CURRENCY_OPTIONS}
        ariaLabel="Símbolo mostrado junto a los montos"
        onChange={(symbol) => {
          setCurrencySymbol(symbol)
          refresh()
        }}
      />
      <div className={HINT}>Solo cambia el símbolo mostrado. Los montos se guardan y calculan igual, en COP.</div>
    </div>
  )
}

function Backup() {
  const { reload } = useData()
  const [status, setStatus] = useState({ cls: 'form-status', msg: '' })

  const exportar = async () => {
    try {
      const data = await apiFetch('/api/all')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moni-backup-${todayStr()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setStatus({ cls: 'form-status err', msg: errMsg(err) })
    }
  }

  const importar = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    setStatus({ cls: 'form-status', msg: 'Importando...' })
    try {
      const payload: unknown = JSON.parse(await file.text())
      const result = await apiFetch<Record<string, unknown>>('/api/import', { method: 'POST', body: payload })
      await reload()
      setStatus({
        cls: 'form-status ok',
        msg: 'Importado: ' + Object.entries(result).map(([k, v]) => `${String(v)} ${k}`).join(', '),
      })
    } catch (err) {
      setStatus({ cls: 'form-status err', msg: errMsg(err) })
    } finally {
      input.value = ''
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-accent btn-sm" onClick={() => void exportar()}>
          Exportar JSON
        </button>
        <label className="btn btn-dim btn-sm m-0 cursor-pointer">
          Importar JSON
          <input type="file" accept="application/json" className="hidden" onChange={(e) => void importar(e)} />
        </label>
      </div>
      <div className={HINT}>
        Importar solo agrega filas del archivo; no reemplaza lo que ya tenés. Si los ids chocan con datos existentes, fallará.
      </div>
      <div className={status.cls} id="settings-backup-status" role={status.cls.includes('err') ? 'alert' : undefined}>
        {status.msg}
      </div>
    </>
  )
}

function TruncateConfirm() {
  const { closeModal, setModalStatus } = useModal()
  const { reload } = useData()
  const [val, setVal] = useState('')

  const confirmar = async () => {
    if (val.trim() !== 'BORRAR') {
      setModalStatus('err', 'Escribí BORRAR (en mayúsculas) para confirmar')
      return
    }
    setModalStatus('', 'Borrando...')
    try {
      await apiFetch('/api/truncate', { method: 'POST' })
      closeModal()
      await reload()
    } catch (err) {
      setModalStatus('err', errMsg(err))
    }
  }

  return (
    <>
      <div className="mb-4 text-sm text-muted-foreground">
        Esto borra permanentemente todas las transacciones, deudas, inversiones, activos y recurrentes.
        Esta acción no se puede deshacer. Exportá un backup antes si no estás seguro.
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-confirm-truncate">Escribí BORRAR para confirmar</label>
        <input
          className="form-input"
          type="text"
          id="m-confirm-truncate"
          placeholder="BORRAR"
          autoComplete="off"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
      </div>
      <div className="modal-footer">
        <button className="btn btn-danger" onClick={() => void confirmar()}>
          Borrar todo
        </button>
        <button className="btn btn-dim" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

function Danger() {
  const { openModal } = useModal()
  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">
        Borra todas las transacciones, deudas, inversiones, activos y recurrentes. No se puede deshacer.
      </div>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => openModal('Borrar todos los datos', <TruncateConfirm />)}>
        Borrar todos los datos
      </button>
    </>
  )
}

export function Settings({ active }: TabProps) {
  useData()
  return (
    <TabContent id="settings" active={active}>
      <div className="space-y-3 lg:space-y-4">
        <Panel id="settings-categorias-card" titulo="Categorías">
          <div id="settings-categorias" className="grid gap-5 md:grid-cols-3">
            {CAT_TIPO_LABELS.map(([tipo, label]) => (
              <CategoriaGroup key={tipo} tipo={tipo} label={label} />
            ))}
          </div>
        </Panel>
        <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
          <Panel id="settings-skipped-card" titulo="Próximas operaciones ocultas">
            <div id="settings-skipped">
              <Skipped />
            </div>
          </Panel>
          <Panel id="settings-currency-card" titulo="Moneda">
            <div id="settings-currency">
              <Currency />
            </div>
          </Panel>
          <Panel id="settings-backup-card" titulo="Backup">
            <div id="settings-backup">
              <Backup />
            </div>
          </Panel>
          <Panel
            id="settings-danger-card"
            titulo="Zona de peligro"
            className="border-deudas/40"
            extra={<TriangleAlert className="size-4 text-deudas" aria-hidden="true" />}
          >
            <div id="settings-danger">
              <Danger />
            </div>
          </Panel>
        </div>
      </div>
    </TabContent>
  )
}
