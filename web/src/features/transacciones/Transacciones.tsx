import { ArrowDown, ArrowUp, Filter, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Panel, Resumen } from '@/components/panel'
import { cn } from '@/lib/utils'
import { Select } from '../../controls/Select'
import { FRANQUICIA_ICONS } from '../../lib/config'
import { cop, fmtDate, signStr } from '../../lib/format'
import {
  categoriasDisponibles,
  listarTransacciones,
  mesesDisponibles,
  nextSort,
  txDateBucket,
  type TxSort,
  type TxSortCol,
} from '../../lib/transacciones'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import type { Transaccion } from '../../types'
import { openTxForm, openTxFormById } from './forms'
import { resumenTx } from './resumen'

const COLUMNAS: { col: TxSortCol; label: string }[] = [
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
  const icon = tarjeta ? FRANQUICIA_ICONS[tarjeta.franquicia] || FRANQUICIA_ICONS.Otra : 'assets/icons/efectivo.svg'
  const nombre = tarjeta ? (tarjeta.nombre.length > 20 ? tarjeta.nombre.slice(0, 20) + '…' : tarjeta.nombre) : 'Efectivo / Débito'
  return (
    <div className="flex items-center gap-2">
      <img src={icon} width="18" height="18" alt="" className="shrink-0" />
      <span title={tarjeta?.nombre}>{nombre}</span>
    </div>
  )
}

const CELDA = 'px-2 py-2 align-middle'

function TxRow({ t, onEdit }: { t: Transaccion; onEdit: (id: number) => void }) {
  const label = t.tipo === 'ingreso' ? 'Ingreso' : t.tipo === 'gasto' ? 'Gasto' : 'Auto'
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
        }
  return (
    <tr
      {...editable}
      className={cn('border-b last:border-b-0', t.tipo !== 'transfer' && 'cursor-pointer hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring')}
    >
      <td data-label="Fecha" className={cn(CELDA, 'whitespace-nowrap text-xs text-muted-foreground')}>
        {fmtDate(t.fecha)}
      </td>
      <td data-label="Tipo" className={cn(CELDA, 'hidden text-xs text-muted-foreground sm:table-cell')}>
        {label}
      </td>
      <td data-label="Categoría" className={cn(CELDA, 'hidden sm:table-cell')}>
        {t.categoria}
      </td>
      <td data-label="Descripción" className={cn(CELDA, 'min-w-0 max-w-[14rem] truncate')}>
        <span className="block truncate">{t.descripcion || '—'}</span>
        <span className="block truncate text-xs text-muted-foreground sm:hidden">
          {t.categoria} · {label}
        </span>
        <div className="mt-0.5 text-xs text-muted-foreground md:hidden">
          <PmCell t={t} />
        </div>
      </td>
      <td data-label="Monto" className={cn(CELDA, 'whitespace-nowrap text-right font-semibold', t.tipo === 'ingreso' ? 'text-cartera' : t.tipo === 'transfer' ? 'text-muted-foreground' : 'text-foreground')}>
        {prefix}
        {cop(t.monto)}
      </td>
      <td data-label="Método de pago" className={cn(CELDA, 'hidden text-xs text-muted-foreground md:table-cell')}>
        <PmCell t={t} />
      </td>
    </tr>
  )
}

export function Transacciones({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { estado, loaded } = useData()
  const [sort, setSort] = useState<TxSort>({ col: 'fecha', dir: -1 })
  const [panelOpen, setPanelOpen] = useState(false)
  const [mesSel, setMesSel] = useState('')
  const [tipoSel, setTipoSel] = useState('')
  const [catSel, setCatSel] = useState('')

  const meses = mesesDisponibles(estado.transacciones)
  const cats = categoriasDisponibles(estado.transacciones)
  const mes = meses.includes(mesSel) ? mesSel : ''
  const cat = cats.includes(catSel) ? catSel : ''
  if (mes !== mesSel) setMesSel(mes)
  if (cat !== catSel) setCatSel(cat)
  const tipo = tipoSel

  const list = listarTransacciones(estado.transacciones, sort, { tipo, mes, cat })
  const onEdit = (id: number) => openTxFormById(ctx, id)

  const pills = [
    { value: mes, label: mes ? mesLabel(mes) : '', clear: () => setMesSel('') },
    { value: tipo, label: TIPO_LABELS[tipo] ?? '', clear: () => setTipoSel('') },
    { value: cat, label: cat, clear: () => setCatSel('') },
  ].filter((p) => p.value)

  const COLS = 6
  const mensaje = (key: string, children: React.ReactNode) => (
    <tr key={key}>
      <td colSpan={COLS} className="px-2 py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  )

  const rows: React.ReactNode[] = []
  if (!loaded) {
    rows.push(mensaje('loading', 'Cargando...'))
  } else if (!list.length) {
    rows.push(
      mensaje(
        'empty',
        <>
          <div className="font-semibold text-foreground">Sin movimientos</div>
          <div>Agregá un ingreso o gasto con el botón de arriba.</div>
        </>,
      ),
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
          <tr key={`g-${bucket}-${t._id}`} className="tx-group-row bg-muted">
            <td className="tx-group-label px-2 py-1.5 text-xs font-semibold text-muted-foreground" colSpan={COLS}>
              {bucket}
            </td>
          </tr>,
        )
        lastBucket = bucket
      }
      rows.push(<TxRow key={t._id} t={t} onEdit={onEdit} />)
    })
  }

  const r = resumenTx(list)

  return (
    <TabContent id="transacciones" active={active}>
      <div className="space-y-4">
      <Resumen
        id="tx-resumen"
        titulo={pills.length ? 'Te quedó con estos filtros' : 'Te quedó'}
        loaded={loaded}
        valor={
          <>
            {signStr(r.neto)}
            {cop(Math.abs(r.neto))}
          </>
        }
        valorClassName={r.neto < 0 ? 'text-deudas' : undefined}
        color="bg-muted-foreground"
        segmentos={r.categorias}
        dato={
          <span className="text-muted-foreground">
            entró <strong className="font-semibold text-cartera">{cop(r.ingresos)}</strong> · salió <strong className="font-semibold text-foreground">{cop(r.gastos)}</strong>
          </span>
        }
        extra={
          <Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openTxForm(ctx)}>
            <Plus aria-hidden="true" />
            Nuevo movimiento
          </Button>
        }
      />
      <Panel id="tx-movimientos" titulo="Movimientos">
        <div className="filters-bar mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="filter-toggle-btn"
            aria-label="Filtros"
            aria-expanded={panelOpen}
            className={cn(
              'relative inline-flex size-8 items-center justify-center rounded-sm border bg-background hover:bg-muted md:hidden',
              panelOpen && 'bg-muted',
              pills.length > 0 && 'has-filters',
            )}
            onClick={() => setPanelOpen((o) => !o)}
          >
            <Filter className="size-4" aria-hidden="true" />
            {pills.length > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 size-2.5 rounded-full bg-cartera" />}
          </button>
          <div id="tx-filter-pills" className="flex flex-wrap items-center gap-2">
            {pills.map((p) => (
              <span key={p.label} className="filter-pill inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2.5 pr-1 text-xs">
                {p.label}
                <button type="button" className="filter-pill-remove inline-flex size-5 items-center justify-center rounded-full hover:bg-border" aria-label="Quitar filtro" onClick={p.clear}>
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <div id="tx-filter-panel" data-open={panelOpen} className={cn('tx-filter-panel w-full flex-wrap items-center gap-2 md:flex md:w-auto', panelOpen ? 'open flex' : 'hidden')}>
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
        </div>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                {COLUMNAS.map(({ col, label }) => {
                  const activo = sort.col === col
                  const go = () => setSort((s) => nextSort(s, col))
                  const oculta = col === 'tipo' || col === 'categoria' ? 'hidden sm:table-cell' : ''
                  return (
                    <th
                      key={col}
                      className={cn(
                        'th-sort cursor-pointer select-none px-2 py-2 text-xs font-semibold hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                        col === 'monto' ? 'text-right' : 'text-left',
                        activo ? `active ${sort.dir === 1 ? 'asc' : 'desc'} text-foreground` : 'text-muted-foreground',
                        oculta,
                      )}
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
                      {activo && (sort.dir === 1 ? <ArrowUp className="ml-1 inline size-3" aria-hidden="true" /> : <ArrowDown className="ml-1 inline size-3" aria-hidden="true" />)}
                    </th>
                  )
                })}
                <th className="hidden px-2 py-2 text-left text-xs font-semibold text-muted-foreground md:table-cell">Método de pago</th>
              </tr>
            </thead>
            <tbody id="tx-tbody">{rows}</tbody>
          </table>
        </div>
      </Panel>
      </div>
    </TabContent>
  )
}
