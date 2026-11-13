import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { agruparGastos, gastosTxInPeriod, type PeriodoGastos } from '@/lib/dinero'
import { cop, copShort, fmtDateShort, pct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useData } from '@/shell/DataProvider'
import { Barra, Panel, Periodos, Total } from './Seccion'

const PERIODOS: readonly { value: PeriodoGastos; label: string }[] = [
  { value: '1W', label: '1S' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1A' },
  { value: 'ALL', label: 'Todo' },
]
const NOMBRE_PERIODO: Record<PeriodoGastos, string> = {
  '1W': 'la última semana',
  '1M': 'el último mes',
  '3M': 'los últimos 3 meses',
  '6M': 'los últimos 6 meses',
  '1Y': 'el último año',
  ALL: 'todo el historial',
}
const MAX_DETALLE = 6

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
  const max = entries[0]?.[1] ?? 0
  const sel = abierta && porCategoria[abierta] ? abierta : null
  const [topCat, topVal] = entries[0] ?? ['', 0]

  return (
    <Panel
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
      frase={
        loaded && entries.length ? (
          <span id="gastos-frase">
            <span className="font-semibold">{topCat}</span> se lleva el <span className="font-semibold">{pct(total ? (topVal / total) * 100 : 0, 0)}%</span> de lo que
            gastaste en {NOMBRE_PERIODO[period]}.
          </span>
        ) : undefined
      }
    >
      {!loaded ? (
        <div className="space-y-3">
          {[80, 55, 35].map((w) => (
            <div key={w} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : !entries.length ? (
        <p className="py-4 text-sm text-muted-foreground">Sin gastos para este período</p>
      ) : (
        <>
          <ul id="gastos-categorias" className="-mx-2">
            {entries.map(([cat, v], idx) => {
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
                      'grid w-full cursor-pointer grid-cols-[minmax(0,7.5rem)_1fr_auto_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                      open && 'bg-muted',
                    )}
                  >
                    <span className="truncate">{cat}</span>
                    <Barra valor={v} max={max} className={cn('bg-foreground/75 transition-opacity', sel && !open && 'opacity-30')} />
                    <span className="w-16 text-right font-semibold">{copShort(v)}</span>
                    <ChevronDown aria-hidden="true" className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <ul id={`gasto-detalle-${idx}`} className="mx-2 mb-2 divide-y rounded-md border text-[13px]">
                      {txs.slice(0, MAX_DETALLE).map((t, i) => (
                        <li key={`${t._id}-${i}`} className="flex items-baseline gap-3 px-3 py-1.5">
                          <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-muted-foreground">{fmtDateShort(t.fecha)}</span>
                          <span className="min-w-0 flex-1 truncate">{t.descripcion || t.categoria}</span>
                          <span className="font-medium">{cop(t.monto)}</span>
                        </li>
                      ))}
                      {txs.length > MAX_DETALLE && <li className="px-3 py-1.5 text-muted-foreground">y {txs.length - MAX_DETALLE} más en Transacciones</li>}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          <Total label="Total gastado, con tarjetas" valor={cop(total)} />
        </>
      )}
    </Panel>
  )
}
