import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cargarEsteMes } from '@/lib/api'
import { cop, copShort, pct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useVista } from '@/shell/useVista'
import { Panel, Total } from '@/components/panel'

const config = {
  entro: { label: 'Entró', color: 'var(--cartera)' },
  salio: { label: 'Salió', color: 'var(--deudas)' },
} satisfies ChartConfig

export function EsteMes() {
  const { data: r } = useVista('este-mes', cargarEsteMes)
  const loading = r === null
  const quedo = r?.quedo ?? 0
  const f = r?.frase
  const frase =
    f?.tipo === 'quedo' ? (
      <>
        Te quedó el <span className="font-semibold text-inversiones-text">{pct(f.pct)}%</span> de lo que entró.
      </>
    ) : f?.tipo === 'excedio' ? (
      <>
        Salió <span className="font-semibold text-deudas">{pct(f.pct)}%</span> más de lo que entró.
      </>
    ) : (
      'Todavía no entró plata este mes.'
    )

  return (
    <Panel id="dash-mes" titulo="Este mes en tu cartera" frase={loading ? ' ' : <span id="stat-ahorro">{frase}</span>}>
      <dl className="space-y-1 text-[15px]">
        <div className="flex items-baseline justify-between">
          <dt>Entró</dt>
          <dd className="font-medium text-cartera">{r ? `+${cop(r.ingresos)}` : '—'}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt>Salió</dt>
          <dd className="font-medium text-deudas">{r ? `−${cop(r.gastos)}` : '—'}</dd>
        </div>
      </dl>
      <Total label="Te quedó" valor={loading ? '—' : <span className={cn(quedo < 0 && 'text-deudas')}>{`${quedo < 0 ? '−' : ''}${cop(Math.abs(quedo))}`}</span>} />
      <p className="mt-1 text-xs text-muted-foreground">Lo pagado con tarjeta no sale de la cartera.</p>
      {r && (
        <ChartContainer config={config} className="mt-4 aspect-auto h-[120px] w-full" aria-label="Entró y salió por mes, últimos 6 meses">
          <BarChart data={r.meses} margin={{ left: 0, right: 0, top: 4, bottom: 0 }} barGap={2}>
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
