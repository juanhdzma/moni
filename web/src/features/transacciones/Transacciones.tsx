import { ArrowDown, ArrowUp, Filter, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Monto } from '@/components/monto'
import { FraseTexto, Panel, Resumen } from '@/components/panel'
import { cn } from '@/lib/utils'
import { Select } from '../../controls/Select'
import { cargarListadoTx } from '../../lib/api'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { useMeta } from '@/shell/hooks/useMeta'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import type { ColTx, ColumnaTransaccion, FiltrosTx } from '../../types'
import { openTxForm, openTxFormById } from './forms'
import { FilasTx } from './TxTabla'

interface Orden {
  col: string
  dir: 1 | -1
}

const siguienteOrden = (actual: Orden, { col, dir_defecto }: ColumnaTransaccion): Orden =>
  actual.col === col ? { col, dir: actual.dir === 1 ? -1 : 1 } : { col, dir: dir_defecto }

export function Transacciones({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { loaded } = useData()
  const columnas = useMeta()?.columnas_transaccion ?? []
  const [sort, setSort] = useState<Orden>({ col: 'fecha', dir: -1 })
  const [panelOpen, setPanelOpen] = useState(false)
  const [mesSel, setMesSel] = useState('')
  const [tipoSel, setTipoSel] = useState<FiltrosTx['tipo']>('')
  const [catSel, setCatSel] = useState('')

  const params: FiltrosTx = { col: sort.col as ColTx, dir: sort.dir, tipo: tipoSel, mes: mesSel, cat: catSel }
  const { data, loading } = useVista(loaded ? JSON.stringify(params) : null, () => cargarListadoTx(params), DEPENDENCIAS_DE_VISTA.listadoTransacciones)

  if (data && !loading) {
    if (data.filtros.mes !== mesSel) setMesSel(data.filtros.mes)
    if (data.filtros.cat !== catSel) setCatSel(data.filtros.cat)
  }

  const list = data?.items ?? []
  const meses = data?.opciones.meses ?? []
  const cats = data?.opciones.categorias ?? []
  const tipos = data?.opciones.tipos ?? []
  const pills = data?.pills ?? []
  const quitar = { mes: () => setMesSel(''), tipo: () => setTipoSel(''), cat: () => setCatSel('') }
  const onEdit = (id: number) => openTxFormById(ctx, id)

  const r = data?.resumen ?? { neto: 0, dato: null, segmentos: [] }

  return (
    <TabContent id="transacciones" active={active}>
      <div className="space-y-4">
      <Resumen
        id="tx-resumen"
        titulo={pills.length ? 'Te quedó con estos filtros' : 'Te quedó'}
        loaded={!!data}
        valor={<Monto valor={r.neto} color="negativo" />}
        color="bg-muted-foreground"
        segmentos={r.segmentos}
        dato={r.dato && <span className="text-muted-foreground"><FraseTexto frase={r.dato} /></span>}
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
              <span key={p.campo} className="filter-pill inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2.5 pr-1 text-xs">
                {p.label}
                <button type="button" className="filter-pill-remove inline-flex size-5 items-center justify-center rounded-full hover:bg-border" aria-label="Quitar filtro" onClick={quitar[p.campo]}>
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
              value={mesSel}
              onChange={setMesSel}
              options={[{ value: '', label: 'Todos los meses' }, ...meses]}
            />
            <Select
              compact
              id="f-tipo-filter"
              ariaLabel="Tipo"
              value={tipoSel ?? ''}
              onChange={(v) => setTipoSel(tipos.some((t) => t.value === v) ? (v as FiltrosTx['tipo']) : '')}
              options={[{ value: '', label: 'Todos los tipos' }, ...tipos]}
            />
            <Select
              compact
              id="f-cat-filter"
              ariaLabel="Categoría"
              value={catSel}
              onChange={setCatSel}
              options={[{ value: '', label: 'Todas las categorías' }, ...cats.map((c) => ({ value: c, label: c }))]}
            />
          </div>
        </div>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                {columnas.map((columna) => {
                  const { col, label } = columna
                  const activo = sort.col === col
                  const go = () => setSort((s) => siguienteOrden(s, columna))
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
            <tbody id="tx-tbody"><FilasTx items={data ? list : null} agrupar={sort.col === 'fecha'} onEdit={onEdit} /></tbody>
          </table>
        </div>
      </Panel>
      </div>
    </TabContent>
  )
}
