import type { ChartDataset } from 'chart.js'
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useData } from '../../shell/DataProvider'
import { agruparGastos, gastosTxInPeriod, redHeat, type PeriodoGastos } from '../../lib/dinero'
import { cop, copShort, fmtDate } from '../../lib/format'
import type { Transaccion } from '../../types'
import { Pills } from './Pills'
import { Chart, monoFont } from './chartUtils'

const PERIODOS: readonly PeriodoGastos[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL']
const MAX = 8

interface Ctx {
  raw: unknown
}

interface Raw {
  g?: string
  v: number
}

const asRaw = (x: unknown): Raw | null => (x && typeof x === 'object' && 'v' in x ? (x as Raw) : null)

function el(tag: string, cls: string, text: string): HTMLElement {
  const e = document.createElement(tag)
  e.className = cls
  e.textContent = text
  return e
}

function fillTooltip(box: HTMLElement, raw: Raw, all: Transaccion[]) {
  const sorted = all.slice().sort((a, b) => b.fecha.localeCompare(a.fecha))
  const nodes: HTMLElement[] = [el('div', 'tt-title', `${raw.g ?? ''} · ${cop(raw.v)}`)]
  sorted.slice(0, MAX).forEach((t) => {
    const row = el('div', 'tt-row', '')
    row.append(el('span', 'tt-date', fmtDate(t.fecha)), el('span', 'tt-desc', t.descripcion || t.categoria), el('span', 'tt-amt', cop(t.monto)))
    nodes.push(row)
  })
  if (sorted.length > MAX) nodes.push(el('div', 'tt-more', `+${sorted.length - MAX} más`))
  box.replaceChildren(...nodes)
}

function GastosBody({ period }: { period: PeriodoGastos }) {
  const { estado, version, loaded } = useData()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  const grouped = useMemo(
    () => agruparGastos(gastosTxInPeriod(estado.transacciones, period)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version busts the memo after a boundary reset
    [estado, period, version],
  )
  const empty = loaded && !grouped.entries.length

  useEffect(() => {
    const canvas = canvasRef.current
    const { entries, porCategoria } = grouped
    if (!canvas || !entries.length) return
    const values = entries.map(([, v]) => v)
    const vMin = Math.min(...values)
    const vMax = Math.max(...values)
    const font = monoFont()
    const heat = (v: number) => (vMax > vMin ? (v - vMin) / (vMax - vMin) : 0.5)

    const chart = new Chart(canvas, {
      type: 'treemap',
      data: {
        datasets: [
          {
            tree: entries.map(([cat, v]) => ({ cat, v })),
            key: 'v',
            groups: ['cat'],
            spacing: 2,
            borderWidth: 0,
            borderRadius: 4,
            backgroundColor: (c: Ctx) => {
              const raw = asRaw(c.raw)
              return raw ? redHeat(heat(raw.v)) : 'transparent'
            },
            labels: {
              display: true,
              formatter: (c: Ctx) => {
                const raw = asRaw(c.raw)
                return raw?.g ? [raw.g, copShort(raw.v)] : ''
              },
              color: (c: Ctx) => {
                const raw = asRaw(c.raw)
                if (!raw) return '#ffffff'
                return 86 - heat(raw.v) * 56 > 60 ? ['#5c2318', 'rgba(92,35,24,0.7)'] : ['#ffffff', 'rgba(255,255,255,0.75)']
              },
              font: [{ size: 12, weight: 'bold', family: font }, { size: 10, family: font }],
              overflow: 'fit',
            },
          } as unknown as ChartDataset<'treemap'>,
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: ({ tooltip }) => {
              const box = tipRef.current
              if (!box) return
              if (tooltip.opacity === 0) {
                box.style.opacity = '0'
                return
              }
              const raw = asRaw(tooltip.dataPoints?.[0]?.raw)
              if (!raw?.g) {
                box.style.opacity = '0'
                return
              }
              fillTooltip(box, raw, porCategoria[raw.g] ?? [])
              const wrap = box.parentElement
              const maxLeft = Math.max(8, (wrap?.clientWidth ?? 0) - box.offsetWidth - 8)
              const maxTop = Math.max(8, (wrap?.clientHeight ?? 0) - box.offsetHeight - 8)
              box.style.left = Math.max(8, Math.min(tooltip.caretX + 14, maxLeft)) + 'px'
              box.style.top = Math.max(8, Math.min(tooltip.caretY + 14, maxTop)) + 'px'
              box.style.opacity = '1'
            },
          },
        },
      },
    })
    return () => chart.destroy()
  }, [grouped])

  return (
    <>
      <canvas id="chart-gastos-bar" ref={canvasRef} style={empty ? { display: 'none' } : undefined}></canvas>
      <div id="gastos-tooltip" className="chart-tooltip" ref={tipRef}></div>
      {empty && (
        <div
          className="gastos-empty"
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-base)', color: 'var(--text-muted)' }}
        >
          Sin gastos para este período
        </div>
      )}
    </>
  )
}

class GastosBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.error('render gastos falló:', err)
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function GastosCard() {
  const [period, setPeriod] = useState<PeriodoGastos>('1M')
  const { version, reportRenderFailure } = useData()
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          Gastos por categoría <span className="chart-title-note">efectivo + tarjeta</span>
        </div>
        <Pills id="gastos-period-pills" options={PERIODOS} value={period} onChange={setPeriod} />
      </div>
      <div id="gastos-bar-wrap" className="chart-wrap">
        <GastosBoundary key={version} onFail={() => reportRenderFailure('gastos')}>
          <GastosBody period={period} />
        </GastosBoundary>
      </div>
    </div>
  )
}
