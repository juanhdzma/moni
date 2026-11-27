import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cargarEvolucion } from '@/lib/api'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useVista } from '@/shell/hooks/datos/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import type { PeriodoEvolucion, SerieEvolucion } from '@/types'
import { Skeleton } from '@/components/Skeleton'
import { FraseTexto, Panel, Periodos } from '@/components/Panel'

export function Evolucion() {
  const { cop, copShort } = useMoneda()
  const meta = useMeta()
  const [serieElegida, setSerie] = useState<SerieEvolucion | null>(null)
  const [periodoElegido, setPeriod] = useState<PeriodoEvolucion | null>(null)
  const serie = serieElegida ?? (meta?.defaults.serie_evolucion as SerieEvolucion | undefined)
  const period = periodoElegido ?? (meta?.defaults.periodo_evolucion as PeriodoEvolucion | undefined)
  const { data: ev, error } = useVista(serie && period ? `${serie}:${period}` : null, () => cargarEvolucion(serie as SerieEvolucion, period as PeriodoEvolucion), DEPENDENCIAS_DE_VISTA.evolucion)
  const loading = ev === null
  const datos = ev?.puntos ?? []
  const color = `var(--${ev?.tono ?? 'cartera'})`
  const config = { valor: { label: ev?.nombre_serie ?? '', color } } satisfies ChartConfig
  return (
    <Panel
      id="dash-evolucion"
      error={error}
      titulo="Cómo vas"
      extra={
        <div className="flex flex-wrap gap-2">
          <Periodos id="evol-serie" label="Serie" options={meta?.series_evolucion ?? []} value={serie ?? ''} onChange={(s) => setSerie(s as SerieEvolucion)} />
          <Periodos id="evol-period-pills" label="Período" options={(meta?.periodos.evolucion ?? [])} value={period ?? ''} onChange={(p) => setPeriod(p as PeriodoEvolucion)} />
        </div>
      }
      frase={
        ev ? (
          <span id="evol-resumen">
            <FraseTexto frase={ev.frase} />
          </span>
        ) : (
          ' '
        )
      }
    >
      {loading ? (
        <Skeleton className="h-[200px] rounded-lg" />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-[200px] w-full" aria-label={ev?.descripcion_grafico}>
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
