import type { ChartData, ChartDefinition, ChartUnit } from '@/schema/chart'
import type { Chart, ChartConfiguration } from 'chart.js'
import { formatDate, formatDuration } from '@/schema/types'

// 由 compute 的結果與目前的主題組成 Chart.js 的設定。純函數，不建立圖表

// 目前主題的文字、格線與底色。資料的顏色不隨主題改變
export interface ChartTheme {
  text: string
  grid: string
  surface: string
}

// 與 Chart.js 的 Colors plugin 相同的色盤，依序輪流使用。填色為半透明，邊線與線條為原色
const CHART_COLORS = ['#36a2eb', '#ff6384', '#ff9f40', '#ffcd56', '#4bc0c0', '#9966ff', '#c9cbcf']
const FILL_OPACITY = 0.5

// 高光：false 的組或 dataset 調淡。null 表示該欄沒有條件，全部照常
export interface ChartMarks {
  groups: boolean[] | null
  datasets: boolean[] | null
}

const BUBBLE_MIN_RADIUS = 4
const BUBBLE_MAX_RADIUS = 20
export const DIM_OPACITY = 0.25

// 以 #rrggbb 加上不透明度。不是 #rrggbb 時原樣回傳
export function withAlpha (color: string, opacity: number): string {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color)
  if (!match) {
    return color
  }
  const [r, g, b] = match.slice(1).map(part => Number.parseInt(part, 16))
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// 數值的文字分為數字與單位兩段，沒有單位時 suffix 為空字串。options 為 stat 的 sign 與 suffix，date 不套用
export function formatParts (value: unknown, unit: ChartUnit, options: { sign?: boolean, suffix?: string } = {}): { text: string, suffix: string } {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return { text: '', suffix: '' }
  }
  if (unit === 'date') {
    return { text: formatDate(new Date(value)), suffix: '' }
  }
  const plus = options.sign && value > 0 ? '+' : ''
  if (unit === 'duration') {
    return { text: plus + formatDuration(value), suffix: '' }
  }
  if (unit === 'percent') {
    return { text: plus + `${Math.round(value * 10) / 10}`, suffix: options.suffix ?? '%' }
  }
  return { text: plus + (Math.round(value * 100) / 100).toLocaleString(), suffix: options.suffix ?? '' }
}

// 刻度與提示的文字。duration 的值為秒數，date 的值為毫秒
export function formatValue (value: unknown, unit: ChartUnit): string {
  const { text, suffix } = formatParts(value, unit)
  return text + suffix
}

export function colorAt (index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0]!
}

// 沒被選的部分調淡。opacity 為照常時的不透明度
function shade (color: string, on: boolean, opacity = 1): string {
  if (on && opacity === 1) {
    return color
  }
  return withAlpha(color, on ? opacity : opacity * DIM_OPACITY)
}

function axisStyle (theme: ChartTheme, unit: ChartUnit) {
  return {
    grid: { color: theme.grid },
    ticks: { color: theme.text, callback: (value: number | string) => formatValue(Number(value), unit) },
  }
}

// 設定所需的 defineChart 結果
type ChartShape = Pick<ChartDefinition<object>, 'type' | 'stacked' | 'horizontal'>

function categoryConfig (definition: ChartShape, data: Extract<ChartData<object>, { kind: 'category' }>, theme: ChartTheme, marks: ChartMarks): ChartConfiguration {
  const type = definition.type
  const round = ['pie', 'doughnut', 'polarArea'].includes(type)
  // 只有一個 dataset 的長條圖與圓餅類相同，依組上色
  const groupBar = type === 'bar' && data.datasets.length === 1 && !data.datasets[0]?.type
  const byGroup = round || groupBar
  const hasRight = data.datasets.some(dataset => dataset.axis === 'right')
  const groupOn = (groupIndex: number) => marks.groups?.[groupIndex] ?? true
  const datasetOn = (index: number) => marks.datasets?.[index] ?? true

  const datasets = data.datasets.map((dataset, index) => {
    const color = colorAt(index)
    const on = datasetOn(index)
    const line = dataset.type === 'line' || (type === 'line' && dataset.type !== 'bar')
    // 每一組的顏色：組與 dataset 皆被選時照常，否則調淡
    const perGroup = (opacity: number) => data.labels.map((_, groupIndex) =>
      shade(byGroup ? colorAt(groupIndex) : color, on && groupOn(groupIndex), opacity))
    let colors
    if (round) {
      colors = { backgroundColor: perGroup(FILL_OPACITY), borderColor: theme.surface }
    } else if (line || type === 'radar') {
      colors = {
        // radar 的面積彼此重疊，填色較淡
        backgroundColor: shade(color, on, type === 'radar' ? 0.2 : FILL_OPACITY),
        borderColor: shade(color, on),
        pointBackgroundColor: perGroup(FILL_OPACITY),
        pointBorderColor: perGroup(1),
        fill: type === 'radar',
        ...(line ? { tension: 0 } : {}),
      }
    } else {
      colors = { backgroundColor: perGroup(FILL_OPACITY), borderColor: perGroup(1) }
    }
    return {
      label: dataset.label,
      data: dataset.data,
      ...(dataset.type ? { type: dataset.type } : {}),
      ...(dataset.axis === 'right' ? { [definition.horizontal ? 'xAxisID' : 'yAxisID']: 'right' } : {}),
      ...colors,
    }
  })

  // 圖例：依組上色時列出各組（項目帶 index），其餘列出各 dataset（項目帶 datasetIndex）。只有一個 dataset 且不依組上色時（line、radar）不顯示
  let legend: object
  if (byGroup) {
    legend = {
      labels: {
        generateLabels: (chart: Chart) => data.labels.map((text, groupIndex) => ({
          text,
          fillStyle: shade(colorAt(groupIndex), groupOn(groupIndex), FILL_OPACITY),
          strokeStyle: shade(colorAt(groupIndex), groupOn(groupIndex)),
          lineWidth: 1,
          hidden: !chart.getDataVisibility(groupIndex),
          index: groupIndex,
          fontColor: theme.text,
        })),
      },
    }
  } else if (data.datasets.length === 1) {
    legend = { display: false }
  } else {
    legend = {
      labels: {
        generateLabels: (chart: Chart) => data.datasets.map((dataset, index) => ({
          text: dataset.label,
          fillStyle: shade(colorAt(index), datasetOn(index), FILL_OPACITY),
          strokeStyle: shade(colorAt(index), datasetOn(index)),
          lineWidth: 1,
          hidden: !chart.isDatasetVisible(index),
          datasetIndex: index,
          fontColor: theme.text,
        })),
      },
    }
  }

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
        legend,
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label ?? ''}：${formatValue(context.raw, unitOf(context.datasetIndex))}`,
          },
        },
      },
    },
  } as ChartConfiguration
}

function pointConfig (definition: ChartShape, data: Extract<ChartData<object>, { kind: 'point' }>, theme: ChartTheme, marks: ChartMarks): ChartConfiguration {
  const radii = data.datasets.flatMap(dataset => dataset.data.map(point => point.r ?? 0))
  const minR = Math.min(...radii)
  const spanR = Math.max(...radii) - minR
  // bubble 的半徑為像素，依資料的最小值與最大值換算至固定的範圍
  const pixels = (r: number | undefined) => r === undefined
    ? undefined
    : BUBBLE_MIN_RADIUS + (spanR === 0 ? 0.5 : (r - minR) / spanR) * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS)

  const datasets = data.datasets.map((dataset, index) => {
    const color = colorAt(index)
    const on = marks.datasets?.[index] ?? true
    return {
      label: dataset.label,
      data: dataset.data.map(point => ({ x: point.x, y: point.y, ...(point.r === undefined ? {} : { r: pixels(point.r), value: point.r }) })),
      backgroundColor: shade(color, on, FILL_OPACITY),
      borderColor: shade(color, on),
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

export function buildConfig (definition: ChartShape, data: ChartData<object>, theme: ChartTheme, marks: ChartMarks): ChartConfiguration {
  const config = data.kind === 'category'
    ? categoryConfig(definition, data, theme, marks)
    : pointConfig(definition, data, theme, marks)
  const plugins = config.options?.plugins
  config.options = {
    ...config.options,
    responsive: true,
    maintainAspectRatio: false,
    color: theme.text,
    plugins: { ...plugins, legend: { ...plugins?.legend, labels: { ...plugins?.legend?.labels, color: theme.text } } },
  }
  return config
}
