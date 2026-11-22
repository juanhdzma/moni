import type { ReactNode } from 'react'
import { PartyPopper, Plus, CreditCard } from 'lucide-react'
import { Barra, Panel, Resumen } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { cargarResumenDeudas } from '../../lib/api'
import { FRANQUICIA_ICONS, cop, fmtDate } from '../../lib/format'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { useVista } from '@/shell/hooks/useVista'
import type { Deuda, Nivel } from '../../types'
import { openDeudaAdelantoFormById, openDeudaForm, openDeudaFormById, openDeudaPayFormById } from './forms/openers'

const itemCls = 'rounded-xl border p-4'
const miniLabel = 'text-xs text-muted-foreground'
const miniValue = 'text-sm font-semibold'

const COLOR_PROGRESO: Record<Nivel, string> = { alto: 'bg-inversiones', medio: 'bg-activos', bajo: 'bg-deudas' }
const COLOR_USO: Record<Nivel, string> = { alto: 'bg-deudas', medio: 'bg-alerta', bajo: 'bg-inversiones' }

function Item({ nombre, badge, sub, children, actions, className }: { nombre: string; badge?: ReactNode; sub: ReactNode; children: ReactNode; actions: ReactNode; className?: string }) {
  return (
    <div className={itemCls + (className ? ' ' + className : '')}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[15px] font-semibold">{nombre}</div>
        {badge}
      </div>
      <div className="mb-2 text-xs text-muted-foreground">{sub}</div>
      {children}
      <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}

function PrestamoCard({ d }: { d: Deuda }) {
  const ctx = useOpenerCtx()
  const frases = d.frases
  return (
    <Item
      nombre={d.nombre}
      badge={frases?.meses_restantes_texto ? <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{frases.meses_restantes_texto}</span> : undefined}
      sub={frases?.detalle}
      actions={
        <>
          <button className="btn btn-accent btn-sm flex-1" onClick={() => openDeudaPayFormById(ctx, d.id)}>
            Pagar cuota
          </button>
          <button className="btn btn-dim btn-sm" onClick={() => openDeudaPayFormById(ctx, d.id, true)}>
            Abonar
          </button>
          <button className="btn btn-dim btn-sm" onClick={() => openDeudaFormById(ctx, d.id)}>
            Editar
          </button>
        </>
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl font-semibold leading-none tracking-tight text-deudas">{cop(d.saldo_actual)}</div>
        <div className="text-sm font-medium text-muted-foreground">{frases?.progreso_texto}</div>
      </div>
      <div className="mt-3">
        <Barra valor={Math.min(100, d.progreso_pct)} max={100} className={COLOR_PROGRESO[d.nivel_progreso]} />
      </div>
      <div className="mt-2 flex justify-between gap-1">
        <div>
          <div className={miniLabel}>Capital</div>
          <div className={miniValue}>{cop(d.capital_pagado)}</div>
        </div>
        {frases?.intereses_texto != null && (
          <div className="text-center">
            <div className={miniLabel}>Intereses</div>
            <div className={miniValue + ' text-deudas'} title={frases.intereses_ayuda}>
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

function TarjetaCard({ d }: { d: Deuda }) {
  const ctx = useOpenerCtx()
  return (
    <Item
      nombre={d.nombre}
      badge={
        <span className="flex shrink-0 items-center rounded-md bg-muted p-1">
          <img src={FRANQUICIA_ICONS[d.franquicia] || FRANQUICIA_ICONS.Otra} width="20" height="20" alt={d.franquicia || 'Tarjeta'} />
        </span>
      }
      sub={d.frases?.detalle}
      actions={
        <>
          <button className="btn btn-accent btn-sm flex-1" onClick={() => openDeudaPayFormById(ctx, d.id, true)}>
            Abonar
          </button>
          <button className="btn btn-dim btn-sm" onClick={() => openDeudaAdelantoFormById(ctx, d.id)}>
            Adelanto
          </button>
          <button className="btn btn-dim btn-sm" onClick={() => openDeudaFormById(ctx, d.id)}>
            Editar
          </button>
        </>
      }
    >
      <div className="text-2xl font-semibold leading-none tracking-tight text-deudas">{cop(d.saldo_actual)}</div>
      {d.cupo > 0 && (
        <>
          <div className="mt-3">
            <Barra valor={d.uso_pct} max={100} className={COLOR_USO[d.nivel_uso]} />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Disponible: <strong className="text-foreground">{cop(d.disponible)}</strong>
          </div>
        </>
      )}
      {d.total_intereses > 0 && (
        <div className="mt-1 text-sm text-muted-foreground">
          Intereses pagados: <strong className="text-deudas">{cop(d.total_intereses)}</strong>
        </div>
      )}
    </Item>
  )
}

function Empty({ icon, titulo, texto }: { icon: ReactNode; titulo: string; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-6 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <div className="text-sm font-semibold">{titulo}</div>
      <div className="text-sm text-muted-foreground">{texto}</div>
    </div>
  )
}

function Terminada({ d }: { d: Deuda }) {
  const ctx = useOpenerCtx()
  const frases = d.frases
  return (
    <Item
      className="opacity-80"
      nombre={d.nombre}
      badge={<span className="shrink-0 rounded-full bg-inversiones/15 px-2 py-0.5 text-xs font-medium text-inversiones-text">Saldado</span>}
      sub={frases?.detalle}
      actions={
        <button className="btn btn-dim btn-sm flex-1" onClick={() => openDeudaFormById(ctx, d.id)}>
          Ver / Editar
        </button>
      }
    >
      <div className="text-xl font-semibold leading-none tracking-tight">{cop(d.monto_inicial)}</div>
      <div className="mt-1 text-sm text-muted-foreground">capital total pagado</div>
      {frases?.intereses_saldada_texto && <div className="mt-1 text-sm text-deudas">{frases.intereses_saldada_texto}</div>}
    </Item>
  )
}

export function Deudas({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { loaded: cargado } = useData()
  const { data } = useVista('deudas', cargarResumenDeudas, ['deudas'])
  const loaded = cargado && data !== null
  const total = data?.total ?? 0
  const creditos = data?.creditos ?? []
  const tarjetas = data?.tarjetas ?? []
  const terminadas = data?.terminadas ?? []

  return (
    <TabContent id="deudas" active={active}>
      <div className="space-y-4">
        <Resumen
          id="deudas-total"
          titulo="Lo que debés"
          loaded={loaded}
          valor={cop(total)}
          valorClassName="text-deudas"
          color="bg-deudas"
          segmentos={data?.segmentos ?? []}
          dato={
            data && (
              <span className="text-muted-foreground">
                <strong className="font-semibold text-foreground">{data.dato.cuotas}</strong>
                {data.dato.cuotas_sufijo}
                {data.dato.intereses && (
                  <>
                    {' · '}
                    <strong className="font-semibold text-deudas">{data.dato.intereses}</strong> {data.dato.intereses_sufijo}
                  </>
                )}
              </span>
            )
          }
          extra={
            <Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openDeudaForm(ctx)}>
              <Plus aria-hidden="true" />
              Nueva deuda
            </Button>
          }
        />
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Panel id="deudas-creditos" titulo="Créditos">
            <div id="deudas-grid-credito" className="space-y-3">
              {loaded &&
                (creditos.length ? (
                  creditos.map((d) => <PrestamoCard key={d.id} d={d} />)
                ) : (
                  <Empty
                    icon={<PartyPopper aria-hidden="true" className="size-6" />}
                    titulo={terminadas.length ? 'Sin créditos activos' : 'Sin créditos'}
                    texto={terminadas.length ? '¡Todos los créditos están saldados!' : 'Agregá uno con el botón + de arriba.'}
                  />
                ))}
            </div>
          </Panel>
          <Panel id="deudas-tarjetas" titulo="Tarjetas">
            <div id="deudas-grid-tarjeta" className="space-y-3">
              {loaded &&
                (tarjetas.length ? (
                  tarjetas.map((d) => <TarjetaCard key={d.id} d={d} />)
                ) : (
                  <Empty icon={<CreditCard aria-hidden="true" className="size-6" />} titulo="Sin tarjetas" texto="Agregá una para cargarle gastos y seguir su cupo." />
                ))}
            </div>
          </Panel>
        </div>
        <div id="deudas-terminados">
          {loaded && terminadas.length > 0 && (
            <Panel id="deudas-terminadas" titulo="Préstamos terminados">
              <div className="grid gap-3 md:grid-cols-2">
                {terminadas.map((d) => (
                  <Terminada key={d.id} d={d} />
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </TabContent>
  )
}
