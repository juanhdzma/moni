import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { esGastoCartera, monthLabels, monthlySeries, type ResumenDashboard } from '@/lib/dinero'
import { cop, copShort, pct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Transaccion } from '@/types'
import { Panel, Total } from './Seccion'

const MESES = 6
const config = {
  entro: { label: 'Entró', color: 'var(--cartera)' },
  salio: { label: 'Salió', color: 'var(--deudas)' },
} satisfies ChartConfig

const sumar = (list: Transaccion[], f: (t: Transaccion) => boolean) => list.filter(f).reduce((s, t) => s + t.monto, 0)

export function EsteMes({ r, transacciones, loading }: { r: ResumenDashboard; transacciones: Transaccion[]; loading: boolean }) {
  const datos = useMemo(() => {
    const entro = monthlySeries(transacciones, MESES, (l) => sumar(l, (t) => t.tipo === 'ingreso'))
    const salio = monthlySeries(transacciones, MESES, (l) => sumar(l, esGastoCartera))
    return monthLabels(MESES).map((mes, i) => ({ mes, entro: entro[i] ?? 0, salio: salio[i] ?? 0 }))
  }, [transacciones])

  const quedo = r.ingresos - r.gastos
  const frase =
    r.ingresos <= 0 ? (
      'Todavía no entró plata este mes.'
    ) : r.ahorroPct >= 0 ? (
      <>
        Te quedó el <span className="font-semibold text-inversiones-text">{pct(r.ahorroPct)}%</span> de lo que entró.
      </>
    ) : (
      <>
        Salió <span className="font-semibold text-deudas">{pct(-r.ahorroPct)}%</span> más de lo que entró.
      </>
    )

  return (
    <Panel id="dash-mes" titulo="Este mes en tu cartera" frase={loading ? ' ' : <span id="stat-ahorro">{frase}</span>}>
      <dl className="space-y-1 text-[15px]">
        <div className="flex items-baseline justify-between">
          <dt>Entró</dt>
          <dd className="font-medium text-cartera">{loading ? '—' : `+${cop(r.ingresos)}`}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt>Salió</dt>
          <dd className="font-medium text-deudas">{loading ? '—' : `−${cop(r.gastos)}`}</dd>
        </div>
      </dl>
      <Total label="Te quedó" valor={loading ? '—' : <span className={cn(quedo < 0 && 'text-deudas')}>{`${quedo < 0 ? '−' : ''}${cop(Math.abs(quedo))}`}</span>} />
      <p className="mt-1 text-xs text-muted-foreground">Lo pagado con tarjeta no sale de la cartera.</p>
      {!loading && (
        <ChartContainer config={config} className="mt-4 aspect-auto h-[120px] w-full" aria-label="Entró y salió por mes, últimos 6 meses">
          <BarChart data={datos} margin={{ left: 0, right: 0, top: 4, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={6} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v, name) => <span className="flex w-full justify-between gap-3"><span className="text-muted-foreground">{name === 'entro' ? 'Entró' : 'Salió'}</span><span className="font-semibold">{copShort(Number(v))}</span></span>} />} />
            <Bar dataKey="entro" fill="var(--color-entro)" radius={[3, 3, 0, 0]} animationDuration={500} />
            <Bar dataKey="salio" fill="var(--color-salio)" radius={[3, 3, 0, 0]} animationDuration={500} />
          </BarChart>
        </ChartContainer>
      )}
    </Panel>
  )
}
