import { cop, signStr } from '../../lib/format'
import { FRECUENCIAS, nextPaymentStr, toMensual } from '../../lib/recurrentes'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { useMutations } from '../../shell/useMutations'
import type { Recurrente } from '../../types'
import { openRecurrenteForm, openRecurrenteFormById } from './forms'

const col = { display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' } as const

function RecCard({ r }: { r: Recurrente }) {
  const ctx = useOpenerCtx()
  const { crudOpOrBanner } = useMutations()
  const mensual = toMensual(r.monto, r.frecuencia)
  const frecLabel = Object.hasOwn(FRECUENCIAS, r.frecuencia) ? FRECUENCIAS[r.frecuencia].label : r.frecuencia
  const valColor = r.tipo === 'ingreso' ? 'var(--green)' : 'var(--red)'
  const nextStr = r.activo ? nextPaymentStr(r.fecha_inicio, r.frecuencia) : null
  const toggle = () => {
    const { _id, ...rest } = r
    void crudOpOrBanner('rec', 'update', { ...rest, activo: !r.activo, _id })
  }
  return (
    <div className={`rec-item${r.activo ? '' : ' inactive'}`}>
      <div className="rec-item-left">
        <div className="rec-name">{r.nombre}</div>
        <div className="rec-meta">
          <span className="rec-meta-freq">
            {frecLabel} · {cop(r.monto)}
          </span>
          {nextStr && <span className="rec-meta-next">{nextStr}</span>}
        </div>
        {r.notas && <div className="rec-notas">{r.notas}</div>}
      </div>
      <div className="rec-item-right">
        <div className="rec-amount-wrap">
          <div className="rec-amount" style={{ color: valColor }}>
            {cop(mensual)}
          </div>
          <div className="rec-amount-label">por mes</div>
        </div>
        <div className="rec-actions">
          <button className="btn btn-dim btn-sm" onClick={toggle} title={r.activo ? 'Pausar' : 'Activar'}>
            {r.activo ? '⏸' : '▶'}
          </button>
          <button className="btn btn-dim btn-sm" onClick={() => openRecurrenteFormById(ctx, r._id)}>
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ items, emptyMsg }: { items: Recurrente[]; emptyMsg: string }) {
  if (!items.length)
    return <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', padding: 'var(--sp-5) 0' }}>{emptyMsg}</div>
  return (
    <>
      {[...items]
        .sort((a, b) => toMensual(b.monto, b.frecuencia) - toMensual(a.monto, a.frecuencia))
        .map((r) => (
          <RecCard key={r._id} r={r} />
        ))}
    </>
  )
}

export function Recurrentes({ active }: TabProps) {
  const ctx = useOpenerCtx()
  const { estado } = useData()
  const activos = estado.recurrentes.filter((r) => r.activo)
  const totalGas = activos.filter((r) => r.tipo !== 'ingreso').reduce((s, r) => s + toMensual(r.monto, r.frecuencia), 0)
  const totalIng = activos.filter((r) => r.tipo === 'ingreso').reduce((s, r) => s + toMensual(r.monto, r.frecuencia), 0)
  const neto = totalIng - totalGas
  return (
    <TabContent id="recurrentes" active={active}>
      <div className="tab-header">
        <button className="btn btn-accent add-btn" onClick={() => openRecurrenteForm(ctx)}>
          + Nuevo
        </button>
      </div>
      <div className="card" style={{ marginBottom: 'var(--sp-7)' }} id="rec-total">
        <div className="stat-summary stat-summary-3">
          <div className="stat-summary-item stat-hero">
            <div className="stat-label">Ingresos/mes</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{cop(totalIng)}</div>
            <div className="stat-sub">recurrentes activos</div>
          </div>
          <div className="stat-pair">
            <div className="stat-summary-item">
              <div className="stat-label">Gastos/mes</div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>{cop(totalGas)}</div>
              <div className="stat-sub">recurrentes activos</div>
            </div>
            <div className="stat-summary-item">
              <div className="stat-label">Neto mensual</div>
              <div className="stat-value" style={{ color: neto >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {signStr(neto)}
                {cop(Math.abs(neto))}
              </div>
              <div className="stat-sub">ingresos − gastos</div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div>
          <div className="section-title">Ingresos recurrentes</div>
          <div id="rec-ingresos" style={col}>
            <Section items={estado.recurrentes.filter((r) => r.tipo === 'ingreso')} emptyMsg="Sin ingresos recurrentes." />
          </div>
        </div>
        <div>
          <div className="section-title">Gastos fijos</div>
          <div id="rec-gastos" style={col}>
            <Section items={estado.recurrentes.filter((r) => r.tipo !== 'ingreso')} emptyMsg="Sin gastos recurrentes." />
          </div>
        </div>
      </div>
    </TabContent>
  )
}
