import { useMemo, useState } from 'react'
import {
  fechasInversiones,
  fechasTransacciones,
  monthLabels,
  monthlyInvDelta,
  monthlyPatrimonio,
  periodMonths,
  serieHaciaAtras,
  type PeriodoEvolucion,
} from '@/lib/dinero'
import { cop, copShort, signStr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Estado } from '@/types'
import { Periodos, Seccion } from './Seccion'

type Serie = 'patrimonio' | 'inversiones'

const SERIES: readonly { value: Serie; label: string }[] = [
  { value: 'patrimonio', label: 'Patrimonio' },
  { value: 'inversiones', label: 'Inversiones' },
]
const PERIODOS: readonly { value: PeriodoEvolucion; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1A' },
  { value: 'ALL', label: 'Todo' },
]
const ALTO = 152

export function Evolucion({ estado, patrimonio, totalInv, loading }: { estado: Estado; patrimonio: number; totalInv: number; loading: boolean }) {
  const [serie, setSerie] = useState<Serie>('patrimonio')
  const [period, setPeriod] = useState<PeriodoEvolucion>('6M')

  const { labels, deltas, niveles } = useMemo(() => {
    if (serie === 'patrimonio') {
      const count = periodMonths(period, fechasTransacciones(estado.transacciones))
      const d = monthlyPatrimonio(estado.transacciones, count)
      return { labels: monthLabels(count), deltas: d, niveles: serieHaciaAtras(patrimonio, d) }
    }
    const count = periodMonths(period, [...fechasTransacciones(estado.transacciones), ...fechasInversiones(estado.inversiones)])
    const d = monthlyInvDelta(estado.transacciones, count)
    return { labels: monthLabels(count), deltas: d, niveles: serieHaciaAtras(totalInv, d) }
  }, [estado, serie, period, patrimonio, totalInv])

  const desde = niveles[0] ?? 0
  const hasta = niveles[niveles.length - 1] ?? 0
  const cambio = hasta - desde
  const posMax = Math.max(0, ...deltas)
  const negMax = Math.max(0, ...deltas.map((d) => -d))
  const escala = posMax + negMax || 1
  const altoPos = (posMax / escala) * ALTO
  const tintaPos = serie === 'patrimonio' ? 'bg-ink-2' : 'bg-inversiones'
  const conValores = labels.length <= 12

  return (
    <Seccion
      id="dash-evolucion"
      titulo="Cómo cambió mes a mes"
      extra={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Periodos id="evol-serie" label="Serie" options={SERIES} value={serie} onChange={setSerie} />
          <span className="hidden h-4 w-px bg-rule sm:block" aria-hidden="true" />
          <Periodos id="evol-period-pills" label="Período" options={PERIODOS} value={period} onChange={setPeriod} />
        </div>
      }
    >
      <p className="mb-6 text-[15px] text-ink-2" id="evol-resumen">
        {loading ? ' ' : (
          <>
            A fin de {labels[0]} {serie === 'patrimonio' ? 'tenías' : 'tenías invertido'} <span className="text-ink">{copShort(desde)}</span>; hoy{' '}
            <span className="font-semibold text-ink">{copShort(hasta)}</span>{' '}
            <span className={cn('font-semibold', cambio < 0 ? 'text-deudas' : 'text-ink')}>
              ({signStr(cambio)}
              {copShort(Math.abs(cambio))})
            </span>
            .
          </>
        )}
      </p>
      {loading ? (
        <div className="animate-pulse rounded-sm bg-wash" style={{ height: ALTO + 40 }} />
      ) : (
        <figure>
          <ol className="flex items-stretch gap-[3px]" aria-label="Variación por mes">
            {deltas.map((d, i) => {
              const h = (Math.abs(d) / escala) * ALTO
              return (
                <li key={i} className="flex min-w-0 flex-1 flex-col items-center">
                  <span className="sr-only">
                    {labels[i]}: {signStr(d)}
                    {cop(Math.abs(d))}
                  </span>
                  <div aria-hidden="true" className="relative w-full" style={{ height: ALTO }} title={`${labels[i]}: ${signStr(d)}${cop(Math.abs(d))}`}>
                    <div className="absolute inset-x-0 border-t border-ink" style={{ top: altoPos }} />
                    {d !== 0 && (
                      <div
                        className={cn('absolute inset-x-[30%]', d > 0 ? tintaPos : 'bg-deudas')}
                        style={d > 0 ? { top: altoPos - h, height: h } : { top: altoPos, height: h }}
                      />
                    )}
                    {conValores && d !== 0 && (
                      <span
                        className="absolute inset-x-0 text-center text-[11px] leading-none whitespace-nowrap text-ink-2 max-sm:hidden"
                        style={d > 0 ? { top: altoPos - h - 15 } : { top: altoPos + h + 4 }}
                      >
                        {signStr(d)}
                        {copShort(Math.abs(d)).replace('$', '')}
                      </span>
                    )}
                  </div>
                  <span aria-hidden="true" className={cn('mt-2 text-[12px] text-ink-2', !conValores && i % 3 !== 0 && 'invisible')}>
                    {labels[i]}
                  </span>
                </li>
              )
            })}
          </ol>
          <figcaption className="mt-3 text-[13px] text-ink-2">
            Cada barra es lo que {serie === 'patrimonio' ? 'subió o bajó tu patrimonio' : 'entró o salió de tus inversiones'} ese mes. Las revaluaciones de activos e inversiones variables solo aparecen en el valor final.
          </figcaption>
        </figure>
      )}
    </Seccion>
  )
}
