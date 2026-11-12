import type { CSSProperties } from 'react'
import { FRANQUICIA_ICONS, tieneSaldo } from '../../lib/config'
import { fmtIntereses, interesesPagados } from '../../lib/deudas'
import { cop, fmtDate, pct } from '../../lib/format'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import type { Deuda } from '../../types'
import { openDeudaAdelantoFormById, openDeudaForm, openDeudaFormById, openDeudaPayFormById } from './forms'

const miniLabel: CSSProperties = {
  fontSize: 'var(--text-2xs)',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  marginBottom: 2,
}
const bigRed: CSSProperties = {
  fontSize: 'var(--text-3xl)',
  fontWeight: 700,
  color: 'var(--red)',
  letterSpacing: '-0.02em',
  lineHeight: 1,
  fontFamily: 'var(--font-mono)',
}
const headRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }
const subLine: CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 12 }

function PrestamoCard({ d }: { d: Deuda }) {
  const ctx = useOpenerCtx()
  const progress = d.monto_inicial > 0 ? (1 - d.saldo_actual / d.monto_inicial) * 100 : 0
  const pagado = d.monto_inicial - d.saldo_actual
  const mesesLeft = d.cuota_mensual > 0 ? Math.ceil(d.saldo_actual / d.cuota_mensual) : null
  const intereses = interesesPagados(d)
  const barColor = progress >= 75 ? 'var(--income-mid)' : progress >= 40 ? 'var(--debt-mid)' : 'var(--expense-mid)'
  return (
    <div className="debt-card">
      <div style={headRow}>
        <div className="debt-name">{d.nombre}</div>
        {mesesLeft ? (
          <span className="gain-badge gain-debt" style={{ marginLeft: 8, flexShrink: 0 }}>
            ~{mesesLeft}m
          </span>
        ) : null}
      </div>
      <div style={subLine}>
        {pct(d.tasa_ea)}% EA · {cop(d.cuota_mensual)}/mes
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
        <div style={bigRed}>{cop(d.saldo_actual)}</div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>{pct(progress)}% pagado</div>
      </div>
      <div className="progress-track" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="progress-fill" style={{ width: Math.min(100, progress).toFixed(1) + '%', background: barColor }}></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--sp-3)', gap: 'var(--sp-1)' }}>
        <div>
          <div style={miniLabel}>Capital</div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{cop(pagado)}</div>
        </div>
        {intereses !== null && (
          <div style={{ textAlign: 'center' }}>
            <div style={miniLabel}>Intereses</div>
            <div
              style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--expense)' }}
              title={intereses.exacto ? 'Suma de los pagos registrados en Moni' : 'Estimado por amortización — todavía no hay pagos registrados'}
            >
              {fmtIntereses(intereses)}
            </div>
          </div>
        )}
        <div style={{ textAlign: 'right' }}>
          <div style={miniLabel}>Total</div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{cop(d.monto_inicial)}</div>
        </div>
      </div>
      {d.proxima_cuota ? (
        <div style={{ marginTop: 10, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Próxima cuota: <strong style={{ color: 'var(--text)' }}>{fmtDate(d.proxima_cuota)}</strong>
        </div>
      ) : null}
      <div className="card-actions">
        <button className="btn btn-accent btn-sm" style={{ flex: 1 }} onClick={() => openDeudaPayFormById(ctx, d._id)}>
          Pagar cuota
        </button>
        <button className="btn btn-dim btn-sm" style={{ color: 'var(--debt)' }} onClick={() => openDeudaPayFormById(ctx, d._id, true)}>
          Abonar
        </button>
        <button className="btn btn-dim btn-sm" onClick={() => openDeudaFormById(ctx, d._id)}>
          Editar
        </button>
      </div>
    </div>
  )
}

function TarjetaCard({ d }: { d: Deuda }) {
  const ctx = useOpenerCtx()
  const disponible = d.cupo > 0 ? Math.max(0, d.cupo - d.saldo_actual) : null
  const usoPct = d.cupo > 0 ? Math.min(100, (d.saldo_actual / d.cupo) * 100) : 0
  const barColor = usoPct >= 90 ? 'var(--expense-mid)' : usoPct >= 60 ? 'var(--debt-mid)' : 'var(--income-mid)'
  return (
    <div className="debt-card">
      <div style={headRow}>
        <div className="debt-name">{d.nombre}</div>
        <span className="icon-chip" style={{ marginLeft: 8, flexShrink: 0 }}>
          <img src={FRANQUICIA_ICONS[d.franquicia] || FRANQUICIA_ICONS.Otra} width="20" height="20" alt={d.franquicia || 'Tarjeta'} />
        </span>
      </div>
      <div style={subLine}>{d.cupo > 0 ? `Cupo ${cop(d.cupo)}` : 'Sin cupo definido'}</div>
      <div style={bigRed}>{cop(d.saldo_actual)}</div>
      {d.cupo > 0 && (
        <>
          <div className="progress-track" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="progress-fill" style={{ width: usoPct.toFixed(1) + '%', background: barColor }}></div>
          </div>
          <div style={{ marginTop: 10, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Disponible: <strong style={{ color: 'var(--text)' }}>{cop(disponible)}</strong>
          </div>
        </>
      )}
      {d.total_intereses > 0 && (
        <div style={{ marginTop: 6, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Intereses pagados: <strong style={{ color: 'var(--expense)' }}>{cop(d.total_intereses)}</strong>
        </div>
      )}
      <div className="card-actions">
        <button className="btn btn-accent btn-sm" style={{ flex: 1 }} onClick={() => openDeudaPayFormById(ctx, d._id, true)}>
          Abonar
        </button>
        <button className="btn btn-dim btn-sm" onClick={() => openDeudaAdelantoFormById(ctx, d._id)}>
          Adelanto
        </button>
        <button className="btn btn-dim btn-sm" onClick={() => openDeudaFormById(ctx, d._id)}>
          Editar
        </button>
      </div>
    </div>
  )
}

function Empty({ icon, titulo, texto }: { icon: string; titulo: string; texto: string }) {
  return (
    <div className="empty" style={{ gridColumn: '1/-1' }}>
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{titulo}</div>
      <div className="empty-text">{texto}</div>
    </div>
  )
}

function Terminada({ d }: { d: Deuda }) {
  const ctx = useOpenerCtx()
  const intereses = interesesPagados(d)
  return (
    <div className="debt-card" style={{ opacity: 0.7 }}>
      <div style={headRow}>
        <div className="debt-name">{d.nombre}</div>
        <span className="gain-badge gain-pos">Saldado</span>
      </div>
      <div style={subLine}>{pct(d.tasa_ea)}% EA</div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{cop(d.monto_inicial)}</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>capital total pagado</div>
      {intereses !== null && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--expense)', marginTop: 4 }}>{fmtIntereses(intereses)} en intereses</div>
      )}
      <div className="card-actions">
        <button className="btn btn-dim btn-sm" style={{ flex: 1 }} onClick={() => openDeudaFormById(ctx, d._id)}>
          Ver / Editar
        </button>
      </div>
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
      <div className="tab-header">
        <button className="btn btn-accent add-btn" onClick={() => openDeudaForm(ctx)}>
          + Nueva deuda
        </button>
      </div>
      {loaded ? (
        <div className="card" style={{ marginBottom: 16 }} id="deudas-total">
        <div className="stat-summary stat-summary-4">
          <div className="stat-summary-item stat-hero">
            <div className="stat-label">Saldo pendiente</div>
            <div className="stat-value" style={{ color: 'var(--red)' }}>
              {cop(total)}
            </div>
            <div className="stat-sub">pendiente</div>
          </div>
          <div className="stat-pair">
            <div className="stat-summary-item">
              <div className="stat-label">Cuota mensual</div>
              <div className="stat-value">{cop(totalCuotas)}</div>
              <div className="stat-sub">total/mes</div>
            </div>
            <div className="stat-summary-item">
              <div className="stat-label">Activas</div>
              <div className="stat-value">{activas.length}</div>
              <div className="stat-sub">
                {terminadas.length} terminada{terminadas.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="stat-summary-item">
            <div className="stat-label">Intereses pagados</div>
            <div className="stat-value" style={{ color: 'var(--expense)' }}>
              {totalExacto ? '' : '~'}
              {cop(totalIntereses)}
            </div>
            <div className="stat-sub">costo del crédito</div>
          </div>
        </div>
      </div>
      ) : (
        <div className="card" style={{ marginBottom: 16 }} id="deudas-total">
          <div className="stat-label">Total en deudas</div>
          <div className="stat-value">
            <span className="skeleton" style={{ width: 110, height: 28 }}></span>
          </div>
        </div>
      )}
      <div className="grid-2">
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Créditos
          </div>
          <div id="deudas-grid-credito" className="card-list">
            {creditos.length ? (
              creditos.map((d) => <PrestamoCard key={d._id} d={d} />)
            ) : (
              <Empty
                icon="🎉"
                titulo={terminadas.length ? 'Sin créditos activos' : 'Sin créditos'}
                texto={terminadas.length ? '¡Todos los créditos están saldados!' : 'Agregá uno con el botón + de arriba.'}
              />
            )}
          </div>
        </div>
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Tarjetas
          </div>
          <div id="deudas-grid-tarjeta" className="card-list">
            {tarjetas.length ? (
              tarjetas.map((d) => <TarjetaCard key={d._id} d={d} />)
            ) : (
              <Empty icon="💳" titulo="Sin tarjetas" texto="Agregá una para cargarle gastos y seguir su cupo." />
            )}
          </div>
        </div>
      </div>
      <div id="deudas-terminados">
        {terminadas.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>
              Préstamos terminados
            </div>
            <div className="grid-2">
              {terminadas.map((d) => (
                <Terminada key={d._id} d={d} />
              ))}
            </div>
          </div>
        )}
      </div>
    </TabContent>
  )
}
