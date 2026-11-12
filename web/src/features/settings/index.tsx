import { useState, type ChangeEvent } from 'react'
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
    <div className="settings-chip-group">
      <div className="settings-chip-label">
        <span className={`cat-dot cat-dot-${tipo}`}></span>
        {label}
      </div>
      <div className="settings-chips">
        {cats.map((c) => (
          <span className="settings-chip" key={c}>
            {c}
            {isSystemCategory(tipo, c) ? null : (
              <button type="button" className="settings-chip-x" onClick={() => removeCategoria(tipo, c)} aria-label={`Eliminar ${c}`}>
                ✕
              </button>
            )}
          </span>
        ))}
        {!cats.length && <span className="settings-chip-empty">Sin categorías todavía</span>}
      </div>
      <div className="settings-add-row">
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
        <button type="button" className="btn btn-dim btn-sm" onClick={agregar}>
          Agregar
        </button>
      </div>
    </div>
  )
}

function Skipped() {
  const { refresh } = useData()
  const set = loadSkippedOps()
  if (!set.size) return <div className="settings-chip-empty">Ninguna operación oculta.</div>
  return (
    <>
      <div className="settings-list">
        {[...set].map((key) => (
          <div className="recent-item" key={key}>
            <div className="recent-left">
              <div className="recent-desc" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {key}
              </div>
            </div>
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
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-dim btn-sm"
        style={{ marginTop: 'var(--sp-5)' }}
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
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">Símbolo mostrado junto a los montos</label>
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
      <div className="settings-hint">Solo cambia el símbolo mostrado. Los montos se guardan y calculan igual, en COP.</div>
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
      setStatus({ cls: 'form-status err', msg: '❌ ' + errMsg(err) })
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
      setStatus({ cls: 'form-status err', msg: '❌ ' + errMsg(err) })
    } finally {
      input.value = ''
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn btn-accent btn-sm" onClick={() => void exportar()}>
          Exportar JSON
        </button>
        <label className="btn btn-dim btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
          Importar JSON
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => void importar(e)} />
        </label>
      </div>
      <div className="settings-hint">
        Importar solo agrega filas del archivo; no reemplaza lo que ya tenés. Si los ids chocan con datos existentes, fallará.
      </div>
      <div className={status.cls} id="settings-backup-status" style={{ marginTop: 'var(--sp-4)' }}>
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
      setModalStatus('err', '❌ ' + errMsg(err))
    }
  }

  return (
    <>
      <div className="settings-hint" style={{ marginTop: 0, marginBottom: 'var(--sp-7)' }}>
        Esto borra permanentemente todas las transacciones, deudas, inversiones, activos y recurrentes.
        Esta acción no se puede deshacer. Exportá un backup antes si no estás seguro.
      </div>
      <div className="form-group">
        <label className="form-label">Escribí BORRAR para confirmar</label>
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
        <button className="btn btn-dim" style={{ marginLeft: 'auto' }} onClick={closeModal}>
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
      <div className="settings-hint" style={{ marginTop: 0, marginBottom: 'var(--sp-6)' }}>
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
      <div className="card settings-card">
        <div className="section-title">🏷️ Categorías</div>
        <div id="settings-categorias">
          {CAT_TIPO_LABELS.map(([tipo, label]) => (
            <CategoriaGroup key={tipo} tipo={tipo} label={label} />
          ))}
        </div>
      </div>
      <div className="card settings-card">
        <div className="section-title">🕓 Próximas operaciones ocultas</div>
        <div id="settings-skipped">
          <Skipped />
        </div>
      </div>
      <div className="card settings-card">
        <div className="section-title">💱 Moneda</div>
        <div id="settings-currency">
          <Currency />
        </div>
      </div>
      <div className="card settings-card">
        <div className="section-title">💾 Backup</div>
        <div id="settings-backup">
          <Backup />
        </div>
      </div>
      <div className="card settings-card settings-danger-card">
        <div className="section-title">⚠️ Zona de peligro</div>
        <div id="settings-danger">
          <Danger />
        </div>
      </div>
    </TabContent>
  )
}
