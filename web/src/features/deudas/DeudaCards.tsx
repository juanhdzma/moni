import type { ReactNode } from 'react'
import { Barra } from '@/components/Panel'
import { claseDeTono } from '@/components/tono'
import { FRANQUICIA_ICONS, fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useMoneda } from '@/shell/hooks/datos/useMoneda'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useOpenerCtx } from '@/shell/hooks/acciones/openers'
import type { Deuda, ModoPago } from '@/types'
import { openDeudaAdelantoFormById, openDeudaFormById, openDeudaPayFormById } from './forms/openers'

const MODO_CUOTA = 'cuota'
const miniLabel = 'text-xs text-muted-foreground'
const miniValue = 'text-small font-semibold'

interface ItemProps {
  nombre: string
  badge?: ReactNode
  sub: ReactNode
  children: ReactNode
  actions: ReactNode
  className?: string
}

function Item({ nombre, badge, sub, children, actions, className }: ItemProps) {
  return (
    <div className={cn('rounded-xl border p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-body font-semibold">{nombre}</div>
        {badge}
      </div>
      <div className="mb-2 text-xs text-muted-foreground">{sub}</div>
      {children}
      <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}

function BotonesPago({ id, incluirCuota }: { id: number; incluirCuota: boolean }) {
  const ctx = useOpenerCtx()
  const modos = (useMeta()?.modos_pago ?? []).filter((m) => incluirCuota || m.value !== MODO_CUOTA)
  return (
    <>
      {modos.map((m, i) => (
        <button key={m.value} className={cn('btn btn-sm', i === 0 ? 'btn-accent flex-1' : 'btn-dim')} onClick={() => openDeudaPayFormById(ctx, id, m.value as ModoPago)}>
          {m.label}
        </button>
      ))}
    </>
  )
}

function BotonEditar({ id, children = 'Editar', className }: { id: number; children?: ReactNode; className?: string }) {
  const ctx = useOpenerCtx()
  return (
    <button className={cn('btn btn-dim btn-sm', className)} onClick={() => openDeudaFormById(ctx, id)}>
      {children}
    </button>
  )
}

export function PrestamoCard({ d }: { d: Deuda }) {
  const { cop } = useMoneda()
  const frases = d.frases
  return (
    <Item
      nombre={d.nombre}
      badge={frases.meses_restantes_texto ? <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{frases.meses_restantes_texto}</span> : undefined}
      sub={frases.detalle}
      actions={
        <>
          <BotonesPago id={d.id} incluirCuota />
          <BotonEditar id={d.id} />
        </>
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl font-semibold leading-none tracking-tight text-deudas">{cop(d.saldo_actual)}</div>
        <div className="text-small font-medium text-muted-foreground">{frases.progreso_texto}</div>
      </div>
      <div className="mt-3">
        <Barra pct={d.progreso_pct} className={claseDeTono(d.tono_progreso).fondo} />
      </div>
      <div className="mt-2 flex justify-between gap-1">
        <div>
          <div className={miniLabel}>Capital</div>
          <div className={miniValue}>{cop(d.capital_pagado)}</div>
        </div>
        {frases.intereses_texto != null && (
          <div className="text-center">
            <div className={miniLabel}>Intereses</div>
            <div className={cn(miniValue, 'text-deudas')} title={frases.intereses_ayuda}>
              {frases.intereses_texto}
            </div>
          </div>
        )}
        <div className="text-right">
          <div className={miniLabel}>Total</div>
          <div className={miniValue}>{cop(d.monto_inicial)}</div>
        </div>
      </div>
      {d.proxima_cuota ? (
        <div className="mt-2 text-xs text-muted-foreground">
          Próxima cuota: <strong className="text-foreground">{fmtDate(d.proxima_cuota)}</strong>
        </div>
      ) : null}
    </Item>
  )
}

export function TarjetaCard({ d }: { d: Deuda }) {
  const { cop } = useMoneda()
  const ctx = useOpenerCtx()
  return (
    <Item
      nombre={d.nombre}
      badge={
        <span className="flex shrink-0 items-center rounded-md bg-muted p-1">
          <img src={FRANQUICIA_ICONS[d.franquicia] || FRANQUICIA_ICONS.Otra} width="20" height="20" alt={d.franquicia || 'Tarjeta'} />
        </span>
      }
      sub={d.frases.detalle}
      actions={
        <>
          <BotonesPago id={d.id} incluirCuota={false} />
          <button className="btn btn-dim btn-sm" onClick={() => openDeudaAdelantoFormById(ctx, d.id)}>
            Adelanto
          </button>
          <BotonEditar id={d.id} />
        </>
      }
    >
      <div className="text-2xl font-semibold leading-none tracking-tight text-deudas">{cop(d.saldo_actual)}</div>
      {d.tiene_cupo && (
        <>
          <div className="mt-3">
            <Barra pct={d.uso_pct} className={claseDeTono(d.tono_uso).fondo} />
          </div>
          <div className="mt-2 text-small text-muted-foreground">
            Disponible: <strong className="text-foreground">{d.frases.disponible_texto}</strong>
          </div>
        </>
      )}
      {d.frases.intereses_texto && (
        <div className="mt-1 text-small text-muted-foreground">
          Intereses pagados: <strong className="text-deudas">{d.frases.intereses_texto}</strong>
        </div>
      )}
    </Item>
  )
}

export function Terminada({ d }: { d: Deuda }) {
  const { cop } = useMoneda()
  const frases = d.frases
  return (
    <Item
      className="opacity-80"
      nombre={d.nombre}
      badge={<span className="shrink-0 rounded-full bg-inversiones/15 px-2 py-0.5 text-xs font-medium text-inversiones-text">{frases.saldada_badge}</span>}
      sub={frases.detalle}
      actions={<BotonEditar id={d.id} className="flex-1">Ver / Editar</BotonEditar>}
    >
      <div className="text-xl font-semibold leading-none tracking-tight">{cop(d.monto_inicial)}</div>
      <div className="mt-1 text-small text-muted-foreground">{frases.capital_pagado_texto}</div>
      {frases.intereses_saldada_texto && <div className="mt-1 text-small text-deudas">{frases.intereses_saldada_texto}</div>}
    </Item>
  )
}
