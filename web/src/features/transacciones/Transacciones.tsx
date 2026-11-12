import { useState } from 'react'
import { Select } from '../../controls/Select'
import { FRANQUICIA_ICONS } from '../../lib/config'
import { cop, fmtDate } from '../../lib/format'
import {
  categoriasDisponibles,
  listarTransacciones,
  mesesDisponibles,
  nextSort,
  txDateBucket,
  type TxSort,
} from '../../lib/transacciones'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import type { Transaccion } from '../../types'
import { openTxForm, openTxFormById } from './forms'

const COLUMNAS: { col: string; label: string }[] = [
  { col: 'fecha', label: 'Fecha' },
  { col: 'tipo', label: 'Tipo' },
  { col: 'categoria', label: 'Categoría' },
  { col: 'descripcion', label: 'Descripción' },
  { col: 'monto', label: 'Monto' },
]

const TIPO_LABELS: Record<string, string> = { ingreso: 'Ingresos', gasto: 'Gastos' }

const mesLabel = (m: string): string => {
  const [y = '0', mo = '1'] = m.split('-')
  return new Date(+y, +mo - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

function PmCell({ t }: { t: Transaccion }) {
  const { estado } = useData()
  const tarjeta = t.tipo === 'gasto' && t.tarjeta_id ? estado.deudas.find((d) => d._id === t.tarjeta_id) : null
  if (!tarjeta) {
    return (
      <>
        <span className="icon-chip">
          <img src="assets/icons/efectivo.svg" width="18" height="18" alt="" />
        </span>
        <span>Efectivo / Débito</span>
      </>
    )
  }
  const icon = FRANQUICIA_ICONS[tarjeta.franquicia] || FRANQUICIA_ICONS.Otra
  const nombre = tarjeta.nombre.length > 20 ? tarjeta.nombre.slice(0, 20) + '…' : tarjeta.nombre
  return (
    <>
      <span className="icon-chip">
        <img src={icon} width="18" height="18" alt="" />
      </span>
      <span style={{ color: 'var(--text-secondary)' }} title={tarjeta.nombre}>
        {nombre}
      </span>
    </>
  )
}

function TxRow({ t, onEdit }: { t: Transaccion; onEdit: (id: number) => void }) {
  const label = t.tipo === 'ingreso' ? 'Ingreso' : t.tipo === 'gasto' ? 'Gasto' : 'Auto'
  const color = t.tipo === 'ingreso' ? 'var(--positive)' : t.tipo === 'gasto' ? 'var(--negative)' : 'var(--transfer)'
  const prefix = t.tipo === 'ingreso' ? '+' : '−'
  const editable =
    t.tipo === 'transfer'
      ? {}
      : {
          onClick: () => onEdit(t._id),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onEdit(t._id)
            }
          },
          tabIndex: 0,
          role: 'button',
          'aria-label': `Editar ${t.descripcion || t.categoria}`,
          style: { cursor: 'pointer' },
        }
  return (
    <tr {...editable}>
      <td data-label="Fecha">{fmtDate(t.fecha)}</td>
      <td data-label="Tipo">
        <span className={`badge badge-${t.tipo}`}>{label}</span>
      </td>
      <td data-label="Categoría">{t.categoria}</td>
      <td data-label="Descripción">{t.descripcion || '—'}</td>
      <td data-label="Monto" style={{ fontWeight: 600, color }}>
        {prefix}
        {cop(t.monto)}
      </td>
      <td data-label="Método de pago">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PmCell t={t} />
        </div>
      </td>
    </tr>
  )
}

export function Transacciones({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { estado } = useData()
  const [sort, setSort] = useState<TxSort>({ col: 'fecha', dir: -1 })
  const [panelOpen, setPanelOpen] = useState(false)
  const [mesSel, setMesSel] = useState('')
  const [tipoSel, setTipoSel] = useState('')
  const [catSel, setCatSel] = useState('')

  const meses = mesesDisponibles(estado.transacciones)
  const cats = categoriasDisponibles(estado.transacciones)
  const mes = meses.includes(mesSel) ? mesSel : ''
  const cat = cats.includes(catSel) ? catSel : ''
  const tipo = tipoSel

  const list = listarTransacciones(estado.transacciones, sort, { tipo, mes, cat })
  const onEdit = (id: number) => openTxFormById(ctx, id)

  const pills = [
    { value: mes, label: mes ? mesLabel(mes) : '', clear: () => setMesSel('') },
    { value: tipo, label: TIPO_LABELS[tipo] ?? '', clear: () => setTipoSel('') },
    { value: cat, label: cat, clear: () => setCatSel('') },
  ].filter((p) => p.value)

  const rows: React.ReactNode[] = []
  if (!list.length) {
    rows.push(
      <tr key="empty">
        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 56 }}>
          <div style={{ fontSize: 'var(--text-4xl)', marginBottom: 10, opacity: 0.3 }}>📋</div>
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 4 }}>Sin movimientos</div>
          <div style={{ fontSize: 'var(--text-sm)' }}>Agregá un ingreso o gasto con el botón de arriba.</div>
        </td>
      </tr>,
    )
  } else if (sort.col !== 'fecha') {
    list.forEach((t) => rows.push(<TxRow key={t._id} t={t} onEdit={onEdit} />))
  } else {
    const now = new Date()
    let lastBucket: string | null = null
    list.forEach((t) => {
      const bucket = txDateBucket(t.fecha, now)
      if (bucket !== lastBucket) {
        rows.push(
          <tr key={`g-${bucket}-${t._id}`} className="tx-group-row">
            <td className="tx-group-label" colSpan={6}>
              {bucket}
            </td>
          </tr>,
        )
        lastBucket = bucket
      }
      rows.push(<TxRow key={t._id} t={t} onEdit={onEdit} />)
    })
  }

  return (
    <TabContent id="transacciones" active={active}>
      <div className="filters-bar" style={{ marginBottom: 18 }}>
        <button
          className={'filter-toggle-btn' + (panelOpen ? ' active' : '') + (pills.length ? ' has-filters' : '')}
          id="filter-toggle-btn"
          aria-label="Filtros"
          onClick={() => setPanelOpen((o) => !o)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="4 4 20 4 14 12.5 14 19 10 21 10 12.5 4 4" />
          </svg>
        </button>
        <div className="tx-filter-pills" id="tx-filter-pills">
          {pills.map((p) => (
            <span className="filter-pill" key={p.label}>
              {p.label}
              <button type="button" className="filter-pill-remove" aria-label="Quitar filtro" onClick={p.clear}>
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className={'tx-filter-panel' + (panelOpen ? ' open' : '')} id="tx-filter-panel">
          <Select
            compact
            id="f-mes-filter"
            ariaLabel="Mes"
            value={mes}
            onChange={setMesSel}
            options={[{ value: '', label: 'Todos los meses' }, ...meses.map((m) => ({ value: m, label: mesLabel(m) }))]}
          />
          <Select
            compact
            id="f-tipo-filter"
            ariaLabel="Tipo"
            value={tipo}
            onChange={setTipoSel}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'ingreso', label: 'Ingresos' },
              { value: 'gasto', label: 'Gastos' },
            ]}
          />
          <Select
            compact
            id="f-cat-filter"
            ariaLabel="Categoría"
            value={cat}
            onChange={setCatSel}
            options={[{ value: '', label: 'Todas las categorías' }, ...cats.map((c) => ({ value: c, label: c }))]}
          />
        </div>
        <button
          className="btn btn-accent btn-sm add-btn"
          style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
          onClick={() => openTxForm(ctx)}
        >
          + Nuevo movimiento
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {COLUMNAS.map(({ col, label }) => {
                const activo = sort.col === col
                const go = () => setSort((s) => nextSort(s, col))
                return (
                  <th
                    key={col}
                    className={'th-sort' + (activo ? ` active ${sort.dir === 1 ? 'asc' : 'desc'}` : '')}
                    data-col={col}
                    tabIndex={0}
                    role="columnheader"
                    aria-sort={activo ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                    onClick={go}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        go()
                      }
                    }}
                  >
                    {label}
                  </th>
                )
              })}
              <th>Método de pago</th>
            </tr>
          </thead>
          <tbody id="tx-tbody">{rows}</tbody>
        </table>
      </div>
    </TabContent>
  )
}
