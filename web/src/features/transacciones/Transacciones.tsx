import { ArrowDown, ArrowUp, Filter, X } from 'lucide-react'
import { useState } from 'react'
import { BotonNuevo } from '@/components/BotonNuevo'
import { Monto } from '@/components/Monto'
import { FraseTexto, Panel, Resumen } from '@/components/Panel'
import { cn } from '@/lib/utils'
import { Select } from '@/controls/inputs/Select'
import { cargarListadoTx } from '@/lib/api'
import { alActivar } from '@/lib/teclado'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/acciones/openers'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useVista } from '@/shell/hooks/datos/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import type { ColTx, ColumnaOrdenable, FiltrosTx } from '@/types'
import { openTxForm, openTxFormById } from './forms/openers'
import { FilasTx, claseOculta } from './TxTabla'

interface Orden {
  col: ColTx
  dir: 1 | -1
}

const siguienteOrden = (actual: Orden, { col, dir_defecto }: ColumnaOrdenable): Orden =>
  actual.col === col ? { col, dir: actual.dir === 1 ? -1 : 1 } : { col, dir: dir_defecto }

export function Transacciones({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { loaded } = useData()
  const meta = useMeta()
  const columnas = meta?.columnas_transaccion ?? []
  const textos = meta?.textos.transacciones
  const [sortElegido, setSort] = useState<Orden | null>(null)
  const ordenInicial = meta ? ({ col: meta.defaults.orden_tx.col, dir: meta.defaults.orden_tx.dir } as Orden) : null
  const sort = sortElegido ?? ordenInicial
  const [panelOpen, setPanelOpen] = useState(false)
  const [mesSel, setMesSel] = useState('')
  const [tipoSel, setTipoSel] = useState<FiltrosTx['tipo']>('')
  const [catSel, setCatSel] = useState('')

  const params: FiltrosTx | null = sort ? { col: sort.col, dir: sort.dir, tipo: tipoSel, mes: mesSel, cat: catSel } : null
  const { data, loading, error } = useVista(loaded && params ? JSON.stringify(params) : null, () => cargarListadoTx(params as FiltrosTx), DEPENDENCIAS_DE_VISTA.listadoTransacciones)

  const filtros = data && !loading ? data.filtros : null
  const mes = filtros?.mes ?? mesSel
  const cat = filtros?.cat ?? catSel

  const list = data?.items ?? []
  const meses = data?.opciones.meses ?? []
  const cats = data?.opciones.categorias ?? []
  const tipos = data?.opciones.tipos ?? []
  const pills = data?.pills ?? []
  const quitar = { mes: () => setMesSel(''), tipo: () => setTipoSel(''), cat: () => setCatSel('') }
  const onEdit = (id: number) => openTxFormById(ctx, id)

  const r = data?.resumen ?? { titulo: '', neto: 0, neto_tono: 'neutro', neto_signo: '', dato: null, segmentos: [] }

  return (
    <TabContent id="transacciones" active={active}>
      <div className="space-y-4">
      <Resumen
        id="tx-resumen"
        titulo={r.titulo}
        loaded={!!data}
        error={error}
        valor={<Monto valor={r.neto} tono={r.neto_tono} signo={r.neto_signo} color="negativo" />}
        color="bg-muted-foreground"
        segmentos={r.segmentos}
        dato={r.dato && <span className="text-muted-foreground"><FraseTexto frase={r.dato} /></span>}
        extra={
          <BotonNuevo label={textos?.boton_nuevo} onClick={() => openTxForm(ctx)} />
        }
      />
      <Panel id="tx-movimientos" titulo={textos?.titulo_panel ?? ''}>
        <div className="filters-bar mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="filter-toggle-btn"
            aria-label={textos?.aria_filtros}
            aria-expanded={panelOpen}
            className={cn(
              'relative inline-flex size-11 items-center justify-center rounded-sm border bg-background hover:bg-muted md:hidden',
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
                <button type="button" className="filter-pill-remove relative inline-flex size-5 items-center justify-center rounded-full after:absolute after:-inset-3 hover:bg-border" aria-label="Quitar filtro" onClick={quitar[p.campo]}>
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <div id="tx-filter-panel" data-open={panelOpen} className={cn('tx-filter-panel w-full flex-wrap items-center gap-2 md:flex md:w-auto', panelOpen ? 'open flex' : 'hidden')}>
            <Select
              compact
              id="f-mes-filter"
              ariaLabel={textos?.aria_mes}
              value={mes}
              onChange={setMesSel}
              options={[{ value: '', label: textos?.todos_meses ?? '' }, ...meses]}
            />
            <Select
              compact
              id="f-tipo-filter"
              ariaLabel={textos?.aria_tipo}
              value={tipoSel ?? ''}
              onChange={(v) => setTipoSel(tipos.some((t) => t.value === v) ? (v as FiltrosTx['tipo']) : '')}
              options={[{ value: '', label: textos?.todos_tipos ?? '' }, ...tipos]}
            />
            <Select
              compact
              id="f-cat-filter"
              ariaLabel={textos?.aria_categoria}
              value={cat}
              onChange={setCatSel}
              options={[{ value: '', label: textos?.todas_categorias ?? '' }, ...cats.map((c) => ({ value: c, label: c }))]}
            />
          </div>
        </div>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{textos?.titulo_panel}</caption>
            <thead>
              <tr className="border-b">
                {columnas.map((columna) => {
                  const { col, label, ordenable } = columna
                  const activo = ordenable && sort?.col === col
                  const go = () => {
                    if (columna.ordenable && sort) setSort(siguienteOrden(sort, columna))
                  }
                  return (
                    <th
                      key={col}
                      scope="col"
                      className={cn(
                        'px-2 py-3 text-xs font-semibold sm:py-2',
                        col === 'monto' ? 'text-right' : 'text-left',
                        ordenable && 'th-sort cursor-pointer select-none hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                        activo ? `active ${sort?.dir === 1 ? 'asc' : 'desc'} text-foreground` : 'text-muted-foreground',
                        claseOculta(columna),
                      )}
                      data-col={col}
                      {...(ordenable && {
                        tabIndex: 0,
                        'aria-sort': activo ? (sort?.dir === 1 ? 'ascending' : 'descending') : 'none',
                        onClick: go,
                        onKeyDown: alActivar(go),
                      })}
                    >
                      {label}
                      {activo && (sort?.dir === 1 ? <ArrowUp className="ml-1 inline size-3" aria-hidden="true" /> : <ArrowDown className="ml-1 inline size-3" aria-hidden="true" />)}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody id="tx-tbody"><FilasTx items={data ? list : null} columnas={columnas} textoVacio={data?.texto_vacio} agrupar={sort?.col === 'fecha'} onEdit={onEdit} /></tbody>
          </table>
        </div>
      </Panel>
      </div>
    </TabContent>
  )
}
