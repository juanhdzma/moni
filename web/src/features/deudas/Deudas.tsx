import type { ReactNode } from 'react'
import { PartyPopper, Plus, CreditCard } from 'lucide-react'
import { Barra, Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { FRANQUICIA_ICONS, tieneSaldo } from '../../lib/config'
import { fmtIntereses, interesesPagados } from '../../lib/deudas'
import { cop, fmtDate, pct } from '../../lib/format'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import type { Deuda } from '../../types'
import { fraseDeudas, mesesParaSaldar } from './frase'
import { openDeudaAdelantoFormById, openDeudaForm, openDeudaFormById, openDeudaPayFormById } from './forms'

const itemCls = 'rounded-lg border p-3'
const miniLabel = 'text-xs text-muted-foreground'
const miniValue = 'text-sm font-semibold'

function Item({ nombre, badge, sub, children, actions, className }: { nombre: string; badge?: ReactNode; sub: ReactNode; children: ReactNode; actions: ReactNode; className?: string }) {
  return (
    <div className={itemCls + (className ? ' ' + className : '')}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[15px] font-semibold">{nombre}</div>
        {badge}
      </div>
      <div className="mb-2 text-xs text-muted-foreground">{sub}</div>
      {children}
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}

function PrestamoCard({ d }: { d: Deuda }) {
  const ctx = useOpenerCtx()
  const progress = d.monto_inicial > 0 ? (1 - d.saldo_actual / d.monto_inicial) * 100 : 0
  const pagado = d.monto_inicial - d.saldo_actual
  const mesesLeft = d.cuota_mensual > 0 ? Math.ceil(d.saldo_actual / d.cuota_mensual) : null
  const intereses = interesesPagados(d)
  const barColor = progress >= 75 ? 'bg-inversiones' : progress >= 40 ? 'bg-activos' : 'bg-deudas'
  return (
    <Item
      nombre={d.nombre}
      badge={mesesLeft ? <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">~{mesesLeft}m</span> : undefined}
      sub={
        <>
          {pct(d.tasa_ea)}% EA · {cop(d.cuota_mensual)}/mes
        </>
      }
      actions={
        <>
          <button className="btn btn-accent btn-sm flex-1" onClick={() => openDeudaPayFormById(ctx, d._id)}>
            Pagar cuota
          </button>
          <button className="btn btn-dim btn-sm" onClick={() => openDeudaPayFormById(ctx, d._id, true)}>
            Abonar
          </button>
          <button className="btn btn-dim btn-sm" onClick={() => openDeudaFormById(ctx, d._id)}>
            Editar
          </button>
        </>
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl font-semibold leading-none tracking-tight text-deudas">{cop(d.saldo_actual)}</div>
        <div className="text-sm font-medium text-muted-foreground">{pct(progress)}% pagado</div>
      </div>
      <div className="mt-3">
        <Barra valor={Math.min(100, progress)} max={100} className={barColor} />
      </div>
      <div className="mt-2 flex justify-between gap-1">
        <div>
          <div className={miniLabel}>Capital</div>
          <div className={miniValue}>{cop(pagado)}</div>
        </div>
        {intereses !== null && (
          <div className="text-center">
            <div className={miniLabel}>Intereses</div>
            <div
              className={miniValue + ' text-deudas'}
              title={intereses.exacto ? 'Suma de los pagos registrados en Moni' : 'Estimado por amortización — todavía no hay pagos registrados'}
            >
              {fmtIntereses(intereses)}
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
  const disponible = d.cupo > 0 ? Math.max(0, d.cupo - d.saldo_actual) : null
  const usoPct = d.cupo > 0 ? Math.min(100, (d.saldo_actual / d.cupo) * 100) : 0
  const barColor = usoPct >= 90 ? 'bg-deudas' : usoPct >= 60 ? 'bg-alerta' : 'bg-inversiones'
  return (
    <Item
      nombre={d.nombre}
      badge={
        <span className="flex shrink-0 items-center rounded-md bg-muted p-1">
          <img src={FRANQUICIA_ICONS[d.franquicia] || FRANQUICIA_ICONS.Otra} width="20" height="20" alt={d.franquicia || 'Tarjeta'} />
        </span>
      }
      sub={d.cupo > 0 ? `Cupo ${cop(d.cupo)}` : 'Sin cupo definido'}
      actions={
        <>
          <button className="btn btn-accent btn-sm flex-1" onClick={() => openDeudaPayFormById(ctx, d._id, true)}>
            Abonar
          </button>
          <button className="btn btn-dim btn-sm" onClick={() => openDeudaAdelantoFormById(ctx, d._id)}>
            Adelanto
          </button>
          <button className="btn btn-dim btn-sm" onClick={() => openDeudaFormById(ctx, d._id)}>
            Editar
          </button>
        </>
      }
    >
      <div className="text-2xl font-semibold leading-none tracking-tight text-deudas">{cop(d.saldo_actual)}</div>
      {d.cupo > 0 && (
        <>
          <div className="mt-3">
            <Barra valor={usoPct} max={100} className={barColor} />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Disponible: <strong className="text-foreground">{cop(disponible)}</strong>
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
  const intereses = interesesPagados(d)
  return (
    <Item
      className="opacity-80"
      nombre={d.nombre}
      badge={<span className="shrink-0 rounded-full bg-inversiones/15 px-2 py-0.5 text-xs font-medium text-inversiones-text">Saldado</span>}
      sub={<>{pct(d.tasa_ea)}% EA</>}
      actions={
        <button className="btn btn-dim btn-sm flex-1" onClick={() => openDeudaFormById(ctx, d._id)}>
          Ver / Editar
        </button>
      }
    >
      <div className="text-xl font-semibold leading-none tracking-tight">{cop(d.monto_inicial)}</div>
      <div className="mt-1 text-sm text-muted-foreground">capital total pagado</div>
      {intereses !== null && <div className="mt-1 text-sm text-deudas">{fmtIntereses(intereses)} en intereses</div>}
    </Item>
  )
}

function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub: ReactNode; className?: string }) {
  return (
    <div>
      <div className={miniLabel}>{label}</div>
      <div className={'text-lg font-semibold tracking-tight ' + (className ?? '')}>{value}</div>
      <div className={miniLabel}>{sub}</div>
    </div>
  )
}

export function Deudas({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { estado, loaded } = useData()
  const deudas = estado.deudas
  const activas = deudas.filter((d) => d.es_tarjeta || tieneSaldo(d))
  const terminadas = deudas.filter((d) => !d.es_tarjeta && !tieneSaldo(d))
  const total = activas.reduce((s, d) => s + d.saldo_actual, 0)
  const totalCuotas = activas.reduce((s, d) => s + d.cuota_mensual, 0)
  const infoIntereses = deudas.map(interesesPagados).filter((i) => i !== null)
  const totalIntereses = infoIntereses.reduce((s, i) => s + i.valor, 0)
  const totalExacto = infoIntereses.every((i) => i.exacto)
  const creditos = activas.filter((d) => !d.es_tarjeta)
  const tarjetas = activas.filter((d) => d.es_tarjeta)

  return (
    <TabContent id="deudas" active={active}>
      <div className="space-y-4">
        <Panel
          id="deudas-total"
          extra={<Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openDeudaForm(ctx)}><Plus aria-hidden="true" />Nueva deuda</Button>}
          titulo="Total en deudas"
          frase={loaded ? fraseDeudas(total, activas.length > 0, mesesParaSaldar(creditos)) : undefined}
        >
          {loaded ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <Stat label="Saldo pendiente" value={cop(total)} sub="pendiente" className="text-deudas" />
              <Stat label="Cuota mensual" value={cop(totalCuotas)} sub="total/mes" />
              <Stat label="Activas" value={activas.length} sub={`${terminadas.length} terminada${terminadas.length !== 1 ? 's' : ''}`} />
              <Stat
                label="Intereses pagados"
                value={
                  <>
                    {totalExacto ? '' : '~'}
                    {cop(totalIntereses)}
                  </>
                }
                sub="costo del crédito"
                className="text-deudas"
              />
            </div>
          ) : (
            <div className="skeleton h-7 w-28 animate-pulse rounded bg-muted" />
          )}
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Panel id="deudas-creditos" titulo="Créditos">
            <div id="deudas-grid-credito" className="space-y-3">
              {loaded &&
                (creditos.length ? (
                  creditos.map((d) => <PrestamoCard key={d._id} d={d} />)
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
                  tarjetas.map((d) => <TarjetaCard key={d._id} d={d} />)
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
                  <Terminada key={d._id} d={d} />
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </TabContent>
  )
}
