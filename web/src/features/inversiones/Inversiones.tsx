import { ArrowDown, ArrowUp, Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Desactualizado, Panel, Resumen } from '@/components/panel'
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
    <li className="inv-card py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="inv-name min-w-0 truncate text-[15px] font-semibold">{inv.nombre}</div>
        <div className="flex shrink-0 items-center gap-1">
          {inv.tipo === 'variable' && isStale(inv.valor_actualizado_en) && <Desactualizado />}
          <span className={cn('text-sm font-semibold', gainColor(gan))}>
            {signStr(ganP)}
            {pct(Math.abs(ganP))}%
          </span>
        </div>
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
      <div className="card-actions mt-4 flex flex-wrap gap-2">
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
        <Resumen
          id="inv-total"
          titulo="Tus inversiones"
          loaded={loaded}
          valor={cop(totalActual)}
          valorClassName="text-inversiones-text"
          color="bg-inversiones"
          segmentos={lista.map((i) => ({ key: String(i._id), label: i.nombre, valor: i.valor_actual }))}
          dato={
            <>
              {totalInv > 0 && (
                <span className={gainColor(ganancia)}>
                  {ganancia >= 0 ? <ArrowUp className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" /> : <ArrowDown className="mr-0.5 inline size-3.5 -translate-y-px" aria-hidden="true" />}
                  {copShort(Math.abs(ganancia))} ({pct(Math.abs(ganPct))}%) {ganancia >= 0 ? 'ganado' : 'perdido'}
                </span>
              )}
              <span className="text-muted-foreground">
                {totalInv > 0 && ' · '}
                {lista.length} {lista.length === 1 ? 'posición' : 'posiciones'}
              </span>
            </>
          }
          extra={
            <Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openInvForm(ctx)}>
              <Plus aria-hidden="true" />
              Nueva inversión
            </Button>
          }
        />
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
