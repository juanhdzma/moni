import type { ReactNode } from 'react'
import { AlertTriangle, Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/panel'
import { cn } from '@/lib/utils'
import { cop, copShort, fmtDate, isStale, pct, signStr } from '../../lib/format'
import { eaToMv, nextInvPaymentStr } from '../../lib/inversiones'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import type { Inversion } from '../../types'
import {
  openInvAddMoreFormById,
  openInvForm,
  openInvFormById,
  openInvRetirarFormById,
  openInvUpdateValueFormById,
  openInvYieldFormById,
} from './forms'

export function fraseResumen(totalInv: number, totalActual: number): string {
  const gan = totalActual - totalInv
  if (totalInv <= 0 || Math.abs(gan) < 1) return `Tus inversiones valen ${copShort(totalActual)}, lo mismo que pusiste.`
  const p = pct(Math.abs((gan / totalInv) * 100))
  return gan > 0
    ? `Tus inversiones valen ${copShort(totalActual)}: ganaste ${copShort(gan)} (${p}%) sobre lo que pusiste.`
    : `Tus inversiones valen ${copShort(totalActual)}: van ${copShort(-gan)} (${p}%) por debajo de lo que pusiste.`
}

const gainColor = (n: number) => (n >= 0 ? 'text-inversiones-text' : 'text-deudas')

function EmptyCard({ label }: { label: string }) {
  return (
    <li className="empty flex flex-col items-center gap-1 py-6 text-center">
      <TrendingUp className="size-5 text-muted-foreground" aria-hidden="true" />
      <div className="empty-title text-sm font-medium">Sin {label}</div>
      <div className="empty-text text-xs text-muted-foreground">Agregá una con el botón + de arriba.</div>
    </li>
  )
}

function InvCard({ inv }: { inv: Inversion }) {
  const ctx = useOpenerCtx()
  const gan = inv.valor_actual - inv.monto_invertido
  const ganP = inv.monto_invertido > 0 ? (gan / inv.monto_invertido) * 100 : 0
  const mv = inv.tipo === 'fija' && inv.tasa_ea ? eaToMv(inv.tasa_ea) : null
  const nextPago = inv.pago === 'mensual' && inv.dia_pago ? nextInvPaymentStr(inv.dia_pago) : null

  return (
    <li className="inv-card py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="inv-name min-w-0 truncate text-[15px] font-semibold">{inv.nombre}</div>
        <span className={cn('shrink-0 text-sm font-semibold', gainColor(gan))}>
          {signStr(ganP)}
          {pct(Math.abs(ganP))}%
        </span>
      </div>
      {mv !== null && (
        <div className="text-xs text-muted-foreground">
          {pct(inv.tasa_ea, 2)}% EA · {pct(mv, 4)}% MV
          {nextPago ? (
            <>
              {' · '}
              <strong className="font-semibold text-foreground">{nextPago}</strong>
            </>
          ) : null}
        </div>
      )}
      <div className="mt-1 text-2xl font-semibold tracking-tight text-inversiones-text">{cop(inv.valor_actual)}</div>
      <div className="mt-0.5 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Invertido {cop(inv.monto_invertido)}</span>
        <span className={cn('font-semibold', gainColor(gan))}>
          {signStr(gan)}
          {cop(Math.abs(gan))}
        </span>
      </div>
      {inv.fecha_inicio ? <div className="mt-0.5 text-xs text-muted-foreground">Desde {fmtDate(inv.fecha_inicio)}</div> : null}
      {inv.tipo === 'variable' && isStale(inv.valor_actualizado_en) ? (
        <div className="stale-warning mt-1.5 flex items-center gap-1.5 text-xs font-medium text-alerta-text">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          Valor sin actualizar hace más de 1 mes
        </div>
      ) : null}
      <div className="card-actions mt-3 flex flex-wrap gap-2">
        {inv.tipo === 'fija' ? (
          <button className="btn btn-accent btn-sm flex-1" onClick={() => openInvYieldFormById(ctx, inv._id)}>
            Rendimiento
          </button>
        ) : (
          <button className="btn btn-accent btn-sm flex-1" onClick={() => openInvUpdateValueFormById(ctx, inv._id)}>
            Actualizar
          </button>
        )}
        <button className="btn btn-dim btn-sm" onClick={() => openInvAddMoreFormById(ctx, inv._id)}>
          + Más
        </button>
        <button className="btn btn-dim btn-sm text-deudas" onClick={() => openInvRetirarFormById(ctx, inv._id)}>
          Retirar
        </button>
        <button className="btn btn-dim btn-sm" onClick={() => openInvFormById(ctx, inv._id)}>
          Editar
        </button>
      </div>
    </li>
  )
}

function Stat({ label, sub, children, className }: { label: string; sub: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn('text-xl font-semibold tracking-tight', className)}>{children}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  )
}

export function Inversiones({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { estado, loaded } = useData()
  const lista = estado.inversiones
  const totalInv = lista.reduce((s, i) => s + i.monto_invertido, 0)
  const totalActual = lista.reduce((s, i) => s + i.valor_actual, 0)
  const ganancia = totalActual - totalInv
  const ganPct = totalInv > 0 ? (ganancia / totalInv) * 100 : 0
  const fijas = lista.filter((i) => i.tipo === 'fija')
  const variables = lista.filter((i) => i.tipo === 'variable')

  return (
    <TabContent id="inversiones" active={active}>
      <div className="space-y-4">
        <Panel id="inv-total" titulo="Portfolio" extra={<Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openInvForm(ctx)}><Plus aria-hidden="true" />Nueva inversión</Button>} frase={loaded && lista.length ? fraseResumen(totalInv, totalActual) : undefined}>
          {loaded ? (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Valor actual" className="text-inversiones-text" sub={`${lista.length} ${lista.length === 1 ? 'posición' : 'posiciones'}`}>
                {cop(totalActual)}
              </Stat>
              <Stat label="Invertido" sub="capital">
                {cop(totalInv)}
              </Stat>
              <Stat
                label="Ganancia"
                className={gainColor(ganancia)}
                sub={
                  <span className={gainColor(ganancia)}>
                    {signStr(ganPct)}
                    {pct(Math.abs(ganPct))}%
                  </span>
                }
              >
                {signStr(ganancia)}
                {cop(Math.abs(ganancia))}
              </Stat>
            </div>
          ) : (
            <div className="skeleton h-7 w-36 animate-pulse rounded bg-muted" />
          )}
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Panel id="inv-fijas" titulo="Fijas">
            <ul id="inv-grid-fija" className="card-list divide-y">
              {loaded && (fijas.length ? fijas.map((i) => <InvCard key={i._id} inv={i} />) : <EmptyCard label="inversiones fijas" />)}
            </ul>
          </Panel>
          <Panel id="inv-variables" titulo="Variables">
            <ul id="inv-grid-variable" className="card-list divide-y">
              {loaded && (variables.length ? variables.map((i) => <InvCard key={i._id} inv={i} />) : <EmptyCard label="inversiones variables" />)}
            </ul>
          </Panel>
        </div>
      </div>
    </TabContent>
  )
}
