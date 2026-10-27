import type { ChartData, ChartDefinition, ChartUnit } from '@/schema/chart'
import type { ChartConfiguration } from 'chart.js'
import { formatDate, formatDuration } from '@/schema/types'

// 由 compute 的結果與目前的主題組成 Chart.js 的設定。純函數，不建立圖表

// 目前主題的顏色：colors 依共用色名的順序輪流使用
export interface ChartTheme {
  colors: string[]
  text: string
  grid: string
  surface: string
}

const BUBBLE_MIN_RADIUS = 4
const BUBBLE_MAX_RADIUS = 20

// 以 #rrggbb 加上不透明度。不是 #rrggbb 時原樣回傳
export function withAlpha (color: string, opacity: number): string {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color)
  if (!match) {
    return color
  }
  const [r, g, b] = match.slice(1).map(part => Number.parseInt(part, 16))
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// 刻度與提示的文字。duration 的值為秒數，date 的值為毫秒
export function formatValue (value: unknown, unit: ChartUnit): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return ''
  }
  if (unit === 'percent') {
    return `${Math.round(value * 10) / 10}%`
  }
  if (unit === 'duration') {
    return formatDuration(value)
  }
  if (unit === 'date') {
    return formatDate(new Date(value))
  }
  return (Math.round(value * 100) / 100).toLocaleString()
}

function colorAt (theme: ChartTheme, index: number): string {
  return theme.colors[index % theme.colors.length] ?? theme.text
}

function axisStyle (theme: ChartTheme, unit: ChartUnit) {
  return {
    grid: { color: theme.grid },
    ticks: { color: theme.text, callback: (value: number | string) => formatValue(Number(value), unit) },
  }
}

// 設定所需的 defineChart 結果
type ChartShape = Pick<ChartDefinition<object>, 'type' | 'stacked' | 'horizontal'>

function categoryConfig (definition: ChartShape, data: Extract<ChartData<object>, { kind: 'category' }>, theme: ChartTheme): ChartConfiguration {
  const type = definition.type
  const round = ['pie', 'doughnut', 'polarArea'].includes(type)
  const hasRight = data.datasets.some(dataset => dataset.axis === 'right')

  const datasets = data.datasets.map((dataset, index) => {
    const color = colorAt(theme, index)
    const line = dataset.type === 'line' || (type === 'line' && dataset.type !== 'bar')
    return {
      label: dataset.label,
      data: dataset.data,
      ...(dataset.type ? { type: dataset.type } : {}),
      ...(dataset.axis === 'right' ? { [definition.horizontal ? 'xAxisID' : 'yAxisID']: 'right' } : {}),
      ...(round
        ? { backgroundColor: data.labels.map((_, groupIndex) => colorAt(theme, groupIndex)), borderColor: theme.surface }
        : {
            backgroundColor: type === 'radar' ? withAlpha(color, 0.2) : color,
            borderColor: color,
            pointBackgroundColor: color,
            fill: type === 'radar',
            ...(line ? { tension: 0 } : {}),
          }),
    }
  })

  const leftUnit = data.datasets.find(dataset => dataset.axis !== 'right')?.unit ?? 'number'
  const rightUnit = data.datasets.find(dataset => dataset.axis === 'right')?.unit ?? 'number'
  const unitOf = (datasetIndex: number) => data.datasets[datasetIndex]?.unit ?? 'number'

  let scales = {}
  if (type === 'bar' || type === 'line') {
    const valueAxis = definition.horizontal ? 'x' : 'y'
    const indexAxis = definition.horizontal ? 'y' : 'x'
    scales = {
      [indexAxis]: { stacked: definition.stacked, grid: { color: theme.grid }, ticks: { color: theme.text } },
      [valueAxis]: { stacked: definition.stacked, beginAtZero: true, ...axisStyle(theme, leftUnit) },
      ...(hasRight
        ? { right: { position: definition.horizontal ? 'top' : 'right', beginAtZero: true, ...axisStyle(theme, rightUnit), grid: { drawOnChartArea: false } } }
        : {}),
    }
  } else if (type === 'radar' || type === 'polarArea') {
    scales = {
      r: {
        beginAtZero: true,
        grid: { color: theme.grid },
        angleLines: { color: theme.grid },
        pointLabels: { color: theme.text },
        ticks: { color: theme.text, backdropColor: 'transparent', callback: (value: number | string) => formatValue(Number(value), leftUnit) },
      },
    }
  }

  return {
    type,
    data: { labels: data.labels, datasets },
    options: {
      indexAxis: definition.horizontal ? 'y' : 'x',
      scales,
      plugins: {
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label ?? ''}：${formatValue(context.raw, unitOf(context.datasetIndex))}`,
          },
        },
      },
    },
  } as ChartConfiguration
}

function pointConfig (definition: ChartShape, data: Extract<ChartData<object>, { kind: 'point' }>, theme: ChartTheme): ChartConfiguration {
  const radii = data.datasets.flatMap(dataset => dataset.data.map(point => point.r ?? 0))
  const minR = Math.min(...radii)
  const spanR = Math.max(...radii) - minR
  // bubble 的半徑為像素，依資料的最小值與最大值換算至固定的範圍
  const pixels = (r: number | undefined) => r === undefined
    ? undefined
    : BUBBLE_MIN_RADIUS + (spanR === 0 ? 0.5 : (r - minR) / spanR) * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS)

  const datasets = data.datasets.map((dataset, index) => {
    const color = colorAt(theme, index)
    return {
      label: dataset.label,
      data: dataset.data.map(point => ({ x: point.x, y: point.y, ...(point.r === undefined ? {} : { r: pixels(point.r), value: point.r }) })),
      backgroundColor: withAlpha(color, 0.6),
      borderColor: color,
    }
  })

  return {
    type: definition.type,
    data: { datasets },
    options: {
      scales: {
        x: { type: 'linear', ...axisStyle(theme, data.xUnit) },
        y: { type: 'linear', ...axisStyle(theme, data.yUnit) },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: context => {
              const raw = context.raw as { x: number, y: number, value?: number }
              const r = raw.value === undefined ? '' : `、${formatValue(raw.value, 'number')}`
              return `${context.dataset.label ?? ''}：${formatValue(raw.x, data.xUnit)}、${formatValue(raw.y, data.yUnit)}${r}`
            },
          },
        },
      },
    },
  } as ChartConfiguration
}

export function buildConfig (definition: ChartShape, data: ChartData<object>, theme: ChartTheme): ChartConfiguration {
  const config = data.kind === 'category'
    ? categoryConfig(definition, data, theme)
    : pointConfig(definition, data, theme)
  config.options = {
    ...config.options,
    responsive: true,
    maintainAspectRatio: false,
    color: theme.text,
    plugins: { ...config.options?.plugins, legend: { labels: { color: theme.text } } },
  }
  return config
}
