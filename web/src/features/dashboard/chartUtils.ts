import { CategoryScale, Chart, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js'
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  TreemapController,
  TreemapElement,
)

export const cv = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export const monoFont = (): string => (cv('--font-mono').split(',')[0] ?? '').replace(/['"]/g, '').trim()

export { Chart }
