import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cargarEvolucion } from '@/lib/api'
import { cop, copShort, signStr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useVista } from '@/shell/hooks/useVista'
import type { PeriodoEvolucion, SerieEvolucion } from '@/types'
import { Panel, Periodos } from '@/components/panel'

type Serie = SerieEvolucion

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

export function Evolucion() {
  const [serie, setSerie] = useState<Serie>('patrimonio')
  const [period, setPeriod] = useState<PeriodoEvolucion>('6M')
  const { data: ev } = useVista(`${serie}:${period}`, () => cargarEvolucion(serie, period))
  const loading = ev === null
  const datos = ev?.puntos ?? []
  const cambio = ev?.cambio ?? 0
  const color = serie === 'patrimonio' ? 'var(--cartera)' : 'var(--inversiones)'
  const config = { valor: { label: serie === 'patrimonio' ? 'Patrimonio' : 'Inversiones', color } } satisfies ChartConfig
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
            {ev?.verbo}
            {cambio !== 0 && (
              <>
                {' '}
                <span className={cn('font-semibold', cambio < 0 ? 'text-deudas' : 'text-inversiones-text')}>
                  {signStr(cambio)}
                  {copShort(Math.abs(cambio))}
                </span>
              </>
            )}
            {ev?.sujeto} desde fin de {ev?.mes_desde}: de {copShort(ev?.desde ?? 0)} a <span className="font-semibold">{copShort(ev?.hasta ?? 0)}</span>.
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
