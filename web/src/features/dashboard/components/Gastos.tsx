import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cargarGastos } from '@/lib/api'
import { fmtDateShort } from '@/lib/format'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { cn } from '@/lib/utils'
import { useMeta } from '@/shell/hooks/useMeta'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import type { PeriodoGastos } from '@/types'
import { Barra, FraseTexto, Panel, Periodos, Total } from '@/components/panel'

export function Gastos() {
  const { cop, copShort } = useMoneda()
  const [period, setPeriod] = useState<PeriodoGastos>('1M')
  const [abierta, setAbierta] = useState<string | null>(null)
  const { data: g } = useVista(period, () => cargarGastos(period), DEPENDENCIAS_DE_VISTA.gastos)
  const meta = useMeta()
  const entries = g?.categorias ?? []
  const sel = abierta && entries.some((c) => c.categoria === abierta) ? abierta : null

  return (
    <Panel
      id="dash-gastos"
      titulo="En qué se va tu plata"
      extra={
        <Periodos
          id="gastos-period-pills"
          label="Período de gastos"
          options={(meta?.periodos.gastos ?? [])}
          value={period}
          onChange={(p) => {
            setPeriod(p)
            setAbierta(null)
          }}
        />
      }
      frase={
        g?.frase ? (
          <span id="gastos-frase">
            <FraseTexto frase={g.frase} />
          </span>
        ) : undefined
      }
    >
      {g === null ? (
        <div className="space-y-3">
          {[80, 55, 35].map((w) => (
            <div key={w} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : !entries.length ? (
        <p className="py-4 text-sm text-muted-foreground">{g.texto_vacio}</p>
      ) : (
        <>
          <ul id="gastos-categorias" className="-mx-2">
            {entries.map((c, idx) => {
              const cat = c.categoria
              const open = sel === cat
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
                    <Barra valor={c.valor} max={g?.max ?? 0} className={cn('bg-foreground/75 transition-opacity', sel && !open && 'opacity-30')} />
                    <span className="w-16 text-right font-semibold">{copShort(c.valor)}</span>
                    <ChevronDown aria-hidden="true" className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <ul id={`gasto-detalle-${idx}`} className="mx-2 mb-2 divide-y rounded-md border text-[13px]">
                      {c.detalle.map((t) => (
                        <li key={t.id} className="flex items-baseline gap-3 px-3 py-1.5">
                          <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-muted-foreground">{fmtDateShort(t.fecha)}</span>
                          <span className="min-w-0 flex-1 truncate">{t.descripcion || t.categoria}</span>
                          <span className="font-medium">{cop(t.monto)}</span>
                        </li>
                      ))}
                      {c.restantes_texto && <li className="px-3 py-1.5 text-muted-foreground">{c.restantes_texto}</li>}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          <Total label={g.texto_total} valor={cop(g.total)} />
        </>
      )}
    </Panel>
  )
}
