import { useMemo, useState } from 'react'
import { TabContent, type TabProps } from '../../shell/TabContent'
import { useData } from '../../shell/DataProvider'
import {
  fechasInversiones,
  fechasTransacciones,
  monthLabels,
  monthlyInvDelta,
  monthlyPatrimonio,
  periodMonths,
  resumenDashboard,
  serieHaciaAtras,
  transaccionesRecientes,
  type PeriodoEvolucion,
} from '../../lib/dinero'
import { cop, copShort, fmtDateShort, pct, signStr } from '../../lib/format'
import { GastosCard } from './GastosChart'
import { LineChart } from './LineChart'
import { Pills } from './Pills'
import { ProximasOperaciones } from './ProximasOperaciones'

const PERIODOS_EVOL: readonly PeriodoEvolucion[] = ['1M', '3M', '6M', '1Y', 'ALL']

function Kpi({ id, label, hero, loading, value, color, sub }: { id: string; label: string; hero?: boolean; loading: boolean; value: number; color: string; sub: string }) {
  return (
    <div className={hero ? 'card stat-hero' : 'card'} id={id}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {loading ? <span className="skeleton" style={{ width: hero ? 110 : 90, height: 32 }}></span> : <span style={{ color }}>{copShort(value)}</span>}
      </div>
      <div className="stat-sub">{loading ? '' : sub}</div>
    </div>
  )
}

const plural = (n: number, s: string, p: string) => `${n} ${n !== 1 ? p : s}`

export function Dashboard({ active }: TabProps) {
  const { estado, loaded, version } = useData()
  const [nwPeriod, setNwPeriod] = useState<PeriodoEvolucion>('6M')
  const [invPeriod, setInvPeriod] = useState<PeriodoEvolucion>('6M')

  const loading = !loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps -- version recomputes against the clock after refresh()
  const r = useMemo(() => resumenDashboard(estado), [estado, version])
  const proyStr = `${signStr(r.proyDelta)}${copShort(Math.abs(r.proyDelta))} proyectados próx. 12 meses`
  const invStr =
    r.totalInvertido > 0
      ? `${r.gananciaInv >= 0 ? '+' : ''}${copShort(r.gananciaInv)} (${signStr(r.ganPct)}${pct(Math.abs(r.ganPct))}%)`
      : plural(estado.inversiones.length, 'posición', 'posiciones')
  const pos = (n: number) => (n >= 0 ? 'var(--income)' : 'var(--expense)')

  const nw = useMemo(() => {
    const count = periodMonths(nwPeriod, fechasTransacciones(estado.transacciones))
    return { labels: monthLabels(count), data: serieHaciaAtras(r.patrimonio, monthlyPatrimonio(estado.transacciones, count)) }
  }, [estado, r, nwPeriod])
  const inv = useMemo(() => {
    const count = periodMonths(invPeriod, [...fechasTransacciones(estado.transacciones), ...fechasInversiones(estado.inversiones)])
    return { labels: monthLabels(count), data: serieHaciaAtras(r.totalInv, monthlyInvDelta(estado.transacciones, count)) }
  }, [estado, r, invPeriod])
  const recent = transaccionesRecientes(estado.transacciones)

  return (
    <TabContent id="dashboard" active={active}>
      <div className="grid-5 dash-kpis">
        <Kpi id="stat-networth" label="Net worth" hero loading={loading} value={r.patrimonio} color={pos(r.patrimonio)} sub={proyStr} />
        <div className="stat-pair">
          <Kpi
            id="stat-balance"
            label="Cartera"
            loading={loading}
            value={r.efectivo}
            color={pos(r.efectivo)}
            sub={`↑${copShort(r.ingresos)} · ↓${copShort(r.gastos)} · ${signStr(r.ahorroPct)}${pct(Math.abs(r.ahorroPct))}% ahorro`}
          />
          <Kpi id="stat-inversiones" label="Inversiones" loading={loading} value={r.totalInv} color="var(--inv)" sub={invStr} />
        </div>
        <div className="stat-pair">
          <Kpi id="stat-activos" label="Activos" loading={loading} value={r.totalActivos} color="var(--asset)" sub={plural(estado.activos.length, 'activo', 'activos')} />
          <Kpi
            id="stat-deudas"
            label="Deudas"
            loading={loading}
            value={r.totalDeuda}
            color="var(--red)"
            sub={`${cop(r.cuotaTotal)}/mes · ${plural(r.deudasActivas.length, 'deuda', 'deudas')}`}
          />
        </div>
      </div>
      <div className="dash-main-grid">
        <GastosCard />
        <div className="dash-col-stack">
          <div className="chart-card dash-stack-item">
            <div className="chart-header">
              <div className="chart-title">Evolución net worth</div>
              <Pills id="nw-period-pills" options={PERIODOS_EVOL} value={nwPeriod} onChange={setNwPeriod} />
            </div>
            <div className="chart-wrap" id="dash-evolution-wrap">
              <LineChart
                canvasId="chart-evolution"
                labels={nw.labels}
                data={nw.data}
                colorVar={(nw.data[nw.data.length - 1] ?? 0) >= 0 ? '--green' : '--red'}
                duration={600}
              />
            </div>
          </div>
          <div className="chart-card dash-stack-item">
            <div className="chart-header">
              <div className="chart-title">Evolución de inversiones</div>
              <Pills id="inv-period-pills" options={PERIODOS_EVOL} value={invPeriod} onChange={setInvPeriod} />
            </div>
            <div className="chart-wrap" id="chart-inversiones-evol-wrap">
              <LineChart canvasId="chart-inversiones-evol" labels={inv.labels} data={inv.data} colorVar="--green" duration={400} />
            </div>
          </div>
        </div>
        <div className="dash-col-stack">
          <div className="card dash-list-card dash-stack-item">
            <div className="section-title">Últimos movimientos</div>
            <div className="recent-list" id="recent-list">
              {!loaded ? null : recent.length ? (
                recent.map((t, i) => (
                  <div className="recent-item" key={`${t._id}-${i}`}>
                    <div className="recent-left">
                      <div className="recent-desc">{t.descripcion || t.categoria}</div>
                      <div className="recent-meta">
                        {fmtDateShort(t.fecha)} · {t.categoria}
                      </div>
                    </div>
                    <div className="recent-amount" style={{ color: t.tipo === 'ingreso' ? 'var(--income)' : t.tipo === 'gasto' ? 'var(--expense)' : 'var(--transfer)' }}>
                      {t.tipo === 'ingreso' ? '+' : '−'}
                      {cop(t.monto)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <div className="empty-title">Sin transacciones</div>
                </div>
              )}
            </div>
          </div>
          <div className="card dash-list-card dash-stack-item">
            <div className="section-title">Próximas operaciones</div>
            <div className="recent-list" id="dash-upcoming">
              <ProximasOperaciones />
            </div>
          </div>
        </div>
      </div>
    </TabContent>
  )
}
