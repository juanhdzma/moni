import { cop, fmtDate, isStale, pct, signStr } from '../../lib/format'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { openActivoForm, openActivoFormById, openActivoSellFormById, openActivoUpdateFormById } from './forms'

export function Activos({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { estado } = useData()
  const activos = estado.activos

  const totalIni = activos.reduce((s, a) => s + a.valor_inicial, 0)
  const totalAct = activos.reduce((s, a) => s + a.valor_actual, 0)
  const variacion = totalAct - totalIni
  const varPct = totalIni > 0 ? (variacion / totalIni) * 100 : 0

  return (
    <TabContent id="activos" active={active}>
      <div className="tab-header">
        <button className="btn btn-accent add-btn" onClick={() => openActivoForm(ctx)}>
          + Nuevo activo
        </button>
      </div>
      <div className="card" style={{ marginBottom: 16 }} id="activos-total">
        <div className="stat-summary stat-summary-3">
          <div className="stat-summary-item stat-hero">
            <div className="stat-label">Valor actual</div>
            <div className="stat-value" style={{ color: 'var(--asset-mid)' }}>{cop(totalAct)}</div>
            <div className="stat-sub">{activos.length} activo{activos.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-pair">
            <div className="stat-summary-item">
              <div className="stat-label">Costo inicial</div>
              <div className="stat-value">{cop(totalIni)}</div>
              <div className="stat-sub">invertido</div>
            </div>
            <div className="stat-summary-item">
              <div className="stat-label">Variación</div>
              <div className="stat-value" style={{ color: variacion >= 0 ? 'var(--income-mid)' : 'var(--expense-mid)' }}>
                {signStr(variacion)}{cop(Math.abs(variacion))}
              </div>
              <div className="stat-sub">
                <span className={'gain-badge ' + (variacion >= 0 ? 'gain-pos' : 'gain-neg')}>{signStr(varPct)}{pct(Math.abs(varPct))}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid-2" id="activos-grid">
        {!activos.length && (
          <div className="empty" style={{ gridColumn: '1/-1' }}>
            <div className="empty-icon">🏠</div>
            <div className="empty-title">Sin activos</div>
            <div className="empty-text">Registrá propiedades, vehículos u otros bienes con el botón + de arriba.</div>
          </div>
        )}
        {activos.map((a) => {
          const cambio = a.valor_actual - a.valor_inicial
          const cambioPct = a.valor_inicial > 0 ? (cambio / a.valor_inicial) * 100 : 0
          return (
            <div className="asset-card" key={a._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div className="inv-name">{a.nombre}</div>
                <span className={'gain-badge ' + (cambio >= 0 ? 'gain-pos' : 'gain-neg')} style={{ marginLeft: 8, flexShrink: 0 }}>
                  {signStr(cambioPct)}{pct(Math.abs(cambioPct))}%
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--asset-mid)', letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                {cop(a.valor_actual)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Compra {cop(a.valor_inicial)}</div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: cambio >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                  {signStr(cambio)}{cop(Math.abs(cambio))}
                </div>
              </div>
              {a.fecha_adquisicion && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>Adquirido {fmtDate(a.fecha_adquisicion)}</div>
              )}
              {isStale(a.valor_actualizado_en) && <div className="stale-warning">⚠ Valor sin actualizar hace más de 1 mes</div>}
              <div className="card-actions">
                <button className="btn btn-accent btn-sm" style={{ flex: 1 }} onClick={() => openActivoUpdateFormById(ctx, a._id)}>Actualizar valor</button>
                <button className="btn btn-dim btn-sm" style={{ color: 'var(--expense)' }} onClick={() => openActivoSellFormById(ctx, a._id)}>Vender</button>
                <button className="btn btn-dim btn-sm" onClick={() => openActivoFormById(ctx, a._id)}>Editar</button>
              </div>
            </div>
          )
        })}
      </div>
    </TabContent>
  )
}
