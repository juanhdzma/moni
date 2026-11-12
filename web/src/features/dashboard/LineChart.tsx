import { useEffect, useRef } from 'react'
import { cop, copShort } from '../../lib/format'
import { useData } from '../../shell/DataProvider'
import { Chart, cv, monoFont } from './chartUtils'

interface Props {
  canvasId: string
  labels: string[]
  data: number[]
  colorVar: '--green' | '--red'
  duration: number
}

export function LineChart({ canvasId, labels, data, colorVar, duration }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { loaded } = useData()

  useEffect(() => {
    if (!loaded) return
    const canvas = ref.current
    const ctx2d = canvas?.getContext('2d')
    if (!canvas || !ctx2d) return

    const border = cv('--border')
    const textM = cv('--text-muted')
    const font = monoFont()
    const lineColor = cv(colorVar)

    const containerH = canvas.parentElement?.offsetHeight || 300
    const gradient = ctx2d.createLinearGradient(0, 0, 0, containerH)
    gradient.addColorStop(0, lineColor + '33')
    gradient.addColorStop(1, lineColor + '00')

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: lineColor,
            backgroundColor: gradient,
            fill: true,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: lineColor,
            pointHoverRadius: 6,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: cv('--bg-card'),
            borderColor: border,
            borderWidth: 1,
            titleColor: textM,
            bodyColor: cv('--text'),
            padding: 10,
            cornerRadius: 8,
            callbacks: { label: (c) => ` ${cop(c.parsed.y)}` },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textM, font: { size: 11, family: font } },
            border: { display: false },
          },
          y: {
            grid: { color: border },
            ticks: { color: textM, font: { size: 11, family: font }, callback: (v) => copShort(Number(v)), maxTicksLimit: 5 },
            border: { display: false },
          },
        },
      },
    })
    return () => chart.destroy()
  }, [loaded, canvasId, labels, data, colorVar, duration])

  return <canvas id={canvasId} ref={ref}></canvas>
}
