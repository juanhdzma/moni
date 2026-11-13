import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
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
import { Panel, Periodos } from '@/components/panel'

type Serie = 'patrimonio' | 'inversiones'

const SERIES: readonly { value: Serie; label: string }[] = [
  { value: 'patrimonio', label: 'Patrimonio' },
  { value: 'inversiones', label: 'Inversiones' },
]
const PERIODOS: readonly { value: PeriodoEvolucion; label: string }[] = [
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1A' },
  { value: 'ALL', label: 'Todo' },
]

export function Evolucion({ estado, patrimonio, totalInv, loading }: { estado: Estado; patrimonio: number; totalInv: number; loading: boolean }) {
  const [serie, setSerie] = useState<Serie>('patrimonio')
  const [period, setPeriod] = useState<PeriodoEvolucion>('6M')

  const datos = useMemo(() => {
    const inv = serie === 'inversiones'
    const fechas = inv ? [...fechasTransacciones(estado.transacciones), ...fechasInversiones(estado.inversiones)] : fechasTransacciones(estado.transacciones)
    const count = periodMonths(period, fechas)
    const deltas = inv ? monthlyInvDelta(estado.transacciones, count) : monthlyPatrimonio(estado.transacciones, count)
    const niveles = serieHaciaAtras(inv ? totalInv : patrimonio, deltas)
    const labels = monthLabels(count)
    return niveles.map((valor, i) => ({ mes: labels[i] ?? '', valor }))
  }, [estado, serie, period, patrimonio, totalInv])

  const desde = datos[0]?.valor ?? 0
  const hasta = datos[datos.length - 1]?.valor ?? 0
  const cambio = hasta - desde
  const color = serie === 'patrimonio' ? 'var(--cartera)' : 'var(--inversiones)'
  const config = { valor: { label: serie === 'patrimonio' ? 'Patrimonio' : 'Inversiones', color } } satisfies ChartConfig
  const verbo = cambio > 0 ? 'Subiste' : cambio < 0 ? 'Bajaste' : 'Te mantuviste'
  const sujeto = serie === 'patrimonio' ? '' : ' en inversiones'

  return (
    <Panel
      id="dash-evolucion"
      titulo="Cómo vas"
      extra={
        <div className="flex flex-wrap gap-2">
          <Periodos id="evol-serie" label="Serie" options={SERIES} value={serie} onChange={setSerie} />
          <Periodos id="evol-period-pills" label="Período" options={PERIODOS} value={period} onChange={setPeriod} />
        </div>
      }
      frase={
        loading ? (
          ' '
        ) : (
          <span id="evol-resumen">
            {verbo}
            {cambio !== 0 && (
              <>
                {' '}
                <span className={cn('font-semibold', cambio < 0 ? 'text-deudas' : 'text-inversiones-text')}>
                  {signStr(cambio)}
                  {copShort(Math.abs(cambio))}
                </span>
              </>
            )}
            {sujeto} desde fin de {datos[0]?.mes}: de {copShort(desde)} a <span className="font-semibold">{copShort(hasta)}</span>.
          </span>
        )
      }
    >
      {loading ? (
        <div className="h-[200px] animate-pulse rounded-lg bg-muted" />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-[200px] w-full" aria-label={`Evolución mensual de ${config.valor.label.toLowerCase()}`}>
          <AreaChart data={datos} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="evol-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-valor)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-valor)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => copShort(v)} domain={['auto', 'auto']} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(v) => <span className="font-semibold">{cop(Number(v))}</span>} />} />
            <Area dataKey="valor" type="monotone" stroke="var(--color-valor)" strokeWidth={2} fill="url(#evol-fill)" dot={false} activeDot={{ r: 4 }} animationDuration={500} />
          </AreaChart>
        </ChartContainer>
      )}
    </Panel>
  )
}
