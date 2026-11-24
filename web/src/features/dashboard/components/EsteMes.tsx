import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cargarEsteMes } from '@/lib/api'
import { copShort } from '@/lib/format'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { Monto } from '@/components/monto'
import { FraseTexto, Panel, Total } from '@/components/panel'

const config = {
  entro: { label: 'Entró', color: 'var(--cartera)' },
  salio: { label: 'Salió', color: 'var(--deudas)' },
} satisfies ChartConfig

export function EsteMes() {
  const { data: r } = useVista('este-mes', cargarEsteMes, DEPENDENCIAS_DE_VISTA.esteMes)
  const loading = r === null
  const quedo = r?.quedo ?? 0
  return (
    <Panel id="dash-mes" titulo="Este mes en tu cartera" frase={r ? <span id="stat-ahorro"><FraseTexto frase={r.frase} /></span> : ' '}>
      <dl className="space-y-1 text-[15px]">
        <div className="flex items-baseline justify-between">
          <dt>{config.entro.label}</dt>
          <dd className="font-medium">{r ? <Monto valor={r.ingresos} /> : '—'}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt>{config.salio.label}</dt>
          <dd className="font-medium">{r ? <Monto valor={-r.gastos} color="ninguno" className="text-deudas" /> : '—'}</dd>
        </div>
      </dl>
      <Total label={r?.titulo_quedo ?? ''} valor={loading ? '—' : <Monto valor={quedo} signo="negativo" color="negativo" />} />
      <p className="mt-1 text-xs text-muted-foreground">{r?.texto_tarjeta}</p>
      {r && (
        <ChartContainer config={config} className="mt-4 aspect-auto h-[120px] w-full" aria-label={r.descripcion_grafico}>
          <BarChart data={r.meses} margin={{ left: 0, right: 0, top: 4, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={6} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v, name) => <span className="flex w-full justify-between gap-3"><span className="text-muted-foreground">{config[name as keyof typeof config].label}</span><span className="font-semibold">{copShort(Number(v))}</span></span>} />} />
            <Bar dataKey="entro" fill="var(--color-entro)" radius={[3, 3, 0, 0]} animationDuration={500} />
            <Bar dataKey="salio" fill="var(--color-salio)" radius={[3, 3, 0, 0]} animationDuration={500} />
          </BarChart>
        </ChartContainer>
      )}
    </Panel>
  )
}
