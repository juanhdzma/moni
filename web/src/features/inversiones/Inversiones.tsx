import { cop, fmtDate, isStale, pct, signStr } from '../../lib/format'
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

function EmptyCard({ label }: { label: string }) {
  return (
    <div className="empty" style={{ gridColumn: '1/-1' }}>
      <div className="empty-icon">📈</div>
      <div className="empty-title">Sin {label}</div>
      <div className="empty-text">Agregá una con el botón + de arriba.</div>
    </div>
  )
}

function InvCard({ inv }: { inv: Inversion }) {
  const ctx = useOpenerCtx()
  const gan = inv.valor_actual - inv.monto_invertido
  const ganP = inv.monto_invertido > 0 ? (gan / inv.monto_invertido) * 100 : 0
  const mv = inv.tipo === 'fija' && inv.tasa_ea ? eaToMv(inv.tasa_ea) : null
  const nextPago = inv.pago === 'mensual' && inv.dia_pago ? nextInvPaymentStr(inv.dia_pago) : null

  return (
    <div className="inv-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-1)' }}>
        <div className="inv-name">{inv.nombre}</div>
        <span className={'gain-badge ' + (gan >= 0 ? 'gain-pos' : 'gain-neg')} style={{ marginLeft: 'var(--sp-3)', flexShrink: 0 }}>
          {signStr(ganP)}
          {pct(Math.abs(ganP))}%
        </span>
      </div>
      {mv !== null ? (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-5)' }}>
          {pct(inv.tasa_ea, 2)}% EA · {pct(mv, 4)}% MV
          {nextPago ? (
            <>
              {' · '}
              <strong style={{ color: 'var(--text-secondary)' }}>{nextPago}</strong>
            </>
          ) : null}
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--sp-5)' }}></div>
      )}
      <div
        style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: 'var(--inv)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {cop(inv.valor_actual)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Invertido {cop(inv.monto_invertido)}</div>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: gan >= 0 ? 'var(--income)' : 'var(--expense)' }}>
          {signStr(gan)}
          {cop(Math.abs(gan))}
        </div>
      </div>
      {inv.fecha_inicio ? (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>Desde {fmtDate(inv.fecha_inicio)}</div>
      ) : null}
      {inv.tipo === 'variable' && isStale(inv.valor_actualizado_en) ? (
        <div className="stale-warning">⚠ Valor sin actualizar hace más de 1 mes</div>
      ) : null}
      <div className="card-actions">
        {inv.tipo === 'fija' ? (
          <button className="btn btn-accent btn-sm" style={{ flex: 1 }} onClick={() => openInvYieldFormById(ctx, inv._id)}>
            Rendimiento
          </button>
        ) : (
          <button className="btn btn-accent btn-sm" style={{ flex: 1 }} onClick={() => openInvUpdateValueFormById(ctx, inv._id)}>
            Actualizar
          </button>
        )}
        <button className="btn btn-dim btn-sm" onClick={() => openInvAddMoreFormById(ctx, inv._id)}>
          + Más
        </button>
        <button className="btn btn-dim btn-sm" style={{ color: 'var(--expense)' }} onClick={() => openInvRetirarFormById(ctx, inv._id)}>
          Retirar
        </button>
        <button className="btn btn-dim btn-sm" onClick={() => openInvFormById(ctx, inv._id)}>
          Editar
        </button>
      </div>
    </div>
  )
}

export function Inversiones({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { estado } = useData()
  const lista = estado.inversiones
  const totalInv = lista.reduce((s, i) => s + i.monto_invertido, 0)
  const totalActual = lista.reduce((s, i) => s + i.valor_actual, 0)
  const ganancia = totalActual - totalInv
  const ganPct = totalInv > 0 ? (ganancia / totalInv) * 100 : 0
  const fijas = lista.filter((i) => i.tipo === 'fija')
  const variables = lista.filter((i) => i.tipo === 'variable')

  return (
    <TabContent id="inversiones" active={active}>
      <div className="tab-header">
        <button className="btn btn-accent add-btn" onClick={() => openInvForm(ctx)}>
          + Nueva inversión
        </button>
      </div>
      <div className="card" style={{ marginBottom: 16 }} id="inv-total">
        <div className="stat-summary stat-summary-3">
          <div className="stat-summary-item stat-hero">
            <div className="stat-label">Valor actual</div>
            <div className="stat-value" style={{ color: 'var(--inv)' }}>
              {cop(totalActual)}
            </div>
            <div className="stat-sub">
              {lista.length} posición{lista.length !== 1 ? 'es' : ''}
            </div>
          </div>
          <div className="stat-pair">
            <div className="stat-summary-item">
              <div className="stat-label">Invertido</div>
              <div className="stat-value">{cop(totalInv)}</div>
              <div className="stat-sub">capital</div>
            </div>
            <div className="stat-summary-item">
              <div className="stat-label">Ganancia</div>
              <div className="stat-value" style={{ color: ganancia >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {signStr(ganancia)}
                {cop(Math.abs(ganancia))}
              </div>
              <div className="stat-sub">
                <span className={'gain-badge ' + (ganancia >= 0 ? 'gain-pos' : 'gain-neg')}>
                  {signStr(ganPct)}
                  {pct(Math.abs(ganPct))}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Fijas
          </div>
          <div id="inv-grid-fija" className="card-list">
            {fijas.length ? fijas.map((i) => <InvCard key={i._id} inv={i} />) : <EmptyCard label="inversiones fijas" />}
          </div>
        </div>
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Variables
          </div>
          <div id="inv-grid-variable" className="card-list">
            {variables.length ? variables.map((i) => <InvCard key={i._id} inv={i} />) : <EmptyCard label="inversiones variables" />}
          </div>
        </div>
      </div>
    </TabContent>
  )
}
