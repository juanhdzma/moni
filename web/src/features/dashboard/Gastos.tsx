import { useMemo, useState } from 'react'
import { FilaFiguras } from '@/components/isotipo/FilaFiguras'
import { Pictograma } from '@/components/isotipo/Pictograma'
import { agruparGastos, gastosTxInPeriod, type PeriodoGastos } from '@/lib/dinero'
import { cop, copShort, fmtDateShort, pct } from '@/lib/format'
import { escalaUnidad, fmtUnidad, pictoCategoria } from '@/lib/isotipo'
import { cn } from '@/lib/utils'
import { useData } from '@/shell/DataProvider'
import { Periodos, Seccion } from './Seccion'

const PERIODOS: readonly { value: PeriodoGastos; label: string }[] = [
  { value: '1W', label: '1S' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1A' },
  { value: 'ALL', label: 'Todo' },
]
const MAX_DETALLE = 8

export function Gastos() {
  const { estado, version, loaded } = useData()
  const [period, setPeriod] = useState<PeriodoGastos>('1M')
  const [abierta, setAbierta] = useState<string | null>(null)

  const { entries, porCategoria } = useMemo(
    () => agruparGastos(gastosTxInPeriod(estado.transacciones, period)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version recomputes against the clock after refresh()
    [estado, period, version],
  )
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const unidad = escalaUnidad(entries.map(([, v]) => v))
  const sel = abierta && porCategoria[abierta] ? abierta : null

  return (
    <Seccion
      id="dash-gastos"
      titulo="En qué se va tu plata"
      extra={
        <Periodos
          id="gastos-period-pills"
          label="Período de gastos"
          options={PERIODOS}
          value={period}
          onChange={(p) => {
            setPeriod(p)
            setAbierta(null)
          }}
        />
      }
    >
      {!loaded ? (
        <div className="space-y-4">
          {[70, 45, 25].map((w) => (
            <div key={w} className="h-5 animate-pulse rounded-sm bg-wash" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : !entries.length ? (
        <p className="py-6 text-[15px] text-ink-2">Sin gastos para este período</p>
      ) : (
        <>
          <p className="mb-4 text-[15px] text-ink-2">
            <span className="font-semibold text-ink">{cop(total)}</span> en gastos, incluidas las tarjetas.
          </p>
          <ul className="-mx-2" id="gastos-categorias">
            {entries.map(([cat, v], idx) => {
              const picto = pictoCategoria(cat)
              const open = sel === cat
              const txs = (porCategoria[cat] ?? []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha))
              return (
                <li key={cat}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`gasto-detalle-${idx}`}
                    onClick={() => setAbierta(open ? null : cat)}
                    className={cn(
                      'grid w-full cursor-pointer gap-x-6 gap-y-1.5 rounded-sm px-2 py-2.5 text-left transition-colors hover:bg-wash sm:grid-cols-[11rem_1fr] sm:items-center',
                      open && 'bg-wash',
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-3 sm:block">
                      <span className="flex items-center gap-2 text-[15px] text-ink">
                        <Pictograma nombre={picto} className="size-4 shrink-0" />
                        <span className="truncate">{cat}</span>
                      </span>
                      <span className="text-[15px] font-semibold text-ink sm:mt-0.5 sm:block">
                        {copShort(v)}
                        <span className="ml-2 text-[13px] font-normal text-ink-2">{pct(total ? (v / total) * 100 : 0, 0)}%</span>
                      </span>
                    </span>
                    <FilaFiguras valor={v} unidad={unidad} picto={picto} className={cn('text-ink transition-opacity duration-300', sel && !open && 'opacity-25')} />
                  </button>
                  {open && (
                    <div id={`gasto-detalle-${idx}`} className="px-2 pt-1 pb-4 sm:pl-[calc(11rem+2rem)]">
                      <ul className="divide-y divide-rule border-y border-rule">
                        {txs.slice(0, MAX_DETALLE).map((t, i) => (
                          <li key={`${t._id}-${i}`} className="flex items-baseline gap-4 py-2 text-[14px]">
                            <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-ink-2">{fmtDateShort(t.fecha)}</span>
                            <span className="min-w-0 flex-1 truncate text-ink">{t.descripcion || t.categoria}</span>
                            <span className="font-medium text-ink">{cop(t.monto)}</span>
                          </li>
                        ))}
                      </ul>
                      {txs.length > MAX_DETALLE && <p className="pt-2 text-[13px] text-ink-2">y {txs.length - MAX_DETALLE} más en Transacciones</p>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-2">
            <Pictograma nombre="cuadro" className="size-3.5 text-ink" />
            Una figura = {fmtUnidad(unidad)}. Tocá una categoría para ver sus movimientos.
          </p>
        </>
      )}
    </Seccion>
  )
}
