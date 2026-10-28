import type { ChartData, ChartDefinition, ChartUnit } from '@/schema/chart'
import type { Chart, ChartConfiguration } from 'chart.js'
import { formatDate, formatDuration } from '@/schema/types'

// 由 compute 的結果與目前的主題組成 Chart.js 的設定。純函數，不建立圖表

// 目前主題的顏色：colors 依共用色名的順序輪流使用
export interface ChartTheme {
  colors: string[]
  text: string
  grid: string
  surface: string
}

// 高光：false 的組或 dataset 調淡。null 表示該欄沒有條件，全部照常
export interface ChartMarks {
  groups: boolean[] | null
  datasets: boolean[] | null
}

const BUBBLE_MIN_RADIUS = 4
const BUBBLE_MAX_RADIUS = 20
const DIM_OPACITY = 0.25

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
  const groupColors = data.labels.map((_, groupIndex) => colorAt(theme, groupIndex))
  const hasRight = data.datasets.some(dataset => dataset.axis === 'right')
  const groupOn = (groupIndex: number) => marks.groups?.[groupIndex] ?? true
  const datasetOn = (index: number) => marks.datasets?.[index] ?? true

  const datasets = data.datasets.map((dataset, index) => {
    const color = colorAt(theme, index)
    const on = datasetOn(index)
    const line = dataset.type === 'line' || (type === 'line' && dataset.type !== 'bar')
    // 每一組的顏色：組與 dataset 皆被選時照常，否則調淡
    const perGroup = data.labels.map((_, groupIndex) => shade(byGroup ? groupColors[groupIndex] : color, on && groupOn(groupIndex)))
    let colors
    if (round) {
      colors = { backgroundColor: perGroup, borderColor: theme.surface }
    } else if (line || type === 'radar') {
      colors = {
        backgroundColor: shade(color, on, type === 'radar' ? 0.2 : 1),
        borderColor: shade(color, on),
        pointBackgroundColor: perGroup,
        pointBorderColor: perGroup,
        fill: type === 'radar',
        ...(line ? { tension: 0 } : {}),
      }
    } else {
      colors = { backgroundColor: perGroup, borderColor: perGroup }
    }
    return {
      label: dataset.label,
      data: dataset.data,
      ...(dataset.type ? { type: dataset.type } : {}),
      ...(dataset.axis === 'right' ? { [definition.horizontal ? 'xAxisID' : 'yAxisID']: 'right' } : {}),
      ...colors,
    }
  })

  // 圖例：依組上色時列出各組，其餘列出各 dataset。只有一個 dataset 且不依組上色時（line、radar）不顯示
  let legend: object
  if (byGroup) {
    legend = {
      // 依組上色的長條圖：點擊圖例的處理尚未決定，先停用 Chart.js 預設的隱藏 dataset
      ...(groupBar ? { onClick: () => {} } : {}),
      labels: {
        generateLabels: (chart: Chart) => data.labels.map((text, groupIndex) => ({
          text,
          fillStyle: shade(groupColors[groupIndex] ?? theme.text, groupOn(groupIndex)),
          strokeStyle: shade(groupColors[groupIndex] ?? theme.text, groupOn(groupIndex)),
          lineWidth: 0,
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
          fillStyle: shade(colorAt(theme, index), datasetOn(index)),
          strokeStyle: shade(colorAt(theme, index), datasetOn(index)),
          lineWidth: 0,
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
    const color = colorAt(theme, index)
    const on = marks.datasets?.[index] ?? true
    return {
      label: dataset.label,
      data: dataset.data.map(point => ({ x: point.x, y: point.y, ...(point.r === undefined ? {} : { r: pixels(point.r), value: point.r }) })),
      backgroundColor: shade(color, on, 0.6),
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
