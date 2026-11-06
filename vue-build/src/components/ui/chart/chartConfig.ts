import type { ChartColors, ChartData, ChartDefinition, ChartUnit } from '@/schema/chart'
import type { ColorName } from '@/schema/types'
import type { Chart, ChartConfiguration, LegendItem, Scale } from 'chart.js'
import { formatDate, formatDuration } from '@/schema/types'
import { SPACED_SCALE } from './chartScale'

// 由 compute 的結果與目前的主題組成 Chart.js 的設定。純函數，不建立圖表

// 目前主題的文字、格線與底色。資料的顏色不隨主題改變
export interface ChartTheme {
  text: string
  grid: string
  surface: string
}

// 圖表的色盤：色名與條件式格式相同，色值與 Chart.js 的 Colors plugin 相同。依此順序輪流使用，填色為半透明，邊線與線條為原色
const CHART_PALETTE: Record<ColorName, string> = {
  blue: '#36a2eb',
  red: '#ff6384',
  orange: '#ff9f40',
  yellow: '#ffcd56',
  green: '#4bc0c0',
  purple: '#9966ff',
  grey: '#c9cbcf',
}
const PALETTE_ORDER = Object.keys(CHART_PALETTE) as ColorName[]
const FILL_OPACITY = 0.5

// 高光：false 的組或 dataset 調淡。null 表示該欄沒有條件，全部照常。shown 為 false 的 dataset 不畫出，圖例調淡
export interface ChartMarks {
  groups: boolean[] | null
  datasets: boolean[] | null
  shown: boolean[] | null
}

const BUBBLE_MIN_RADIUS = 4
const BUBBLE_MAX_RADIUS = 20
export const DIM_OPACITY = 0.25
const LEGEND_BOX_WIDTH = 12

// 中日韓文字逐字為一段，其他文字以空白分段
const WRAP_TOKENS = /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Hangul}]|[^\s\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Hangul}]+|\s+/gu

// 依寬度將文字分成多行：中日韓文字可於任何字之間斷開，其他文字優先於空白處斷開，單字仍放不下時逐字斷開。只有一行時回傳字串
export function wrapText (text: string, maxWidth: number, measure: (part: string) => number): string | string[] {
  if (maxWidth <= 0 || measure(text) <= maxWidth) {
    return text
  }
  const lines: string[] = []
  let line = ''
  const push = (token: string) => {
    if (line === '' || measure(line + token) <= maxWidth) {
      line += token
      return
    }
    lines.push(line.trimEnd())
    line = token.trimStart()
  }
  for (const token of text.match(WRAP_TOKENS) ?? []) {
    if (measure(token) <= maxWidth) {
      push(token)
    } else {
      for (const char of token) {
        push(char)
      }
    }
  }
  if (line.trim() !== '') {
    lines.push(line.trimEnd())
  }
  return lines.length > 1 ? lines : lines[0] ?? text
}

// Chart.js 解析後的字型選項
interface ResolvedFont {
  size: number
  family: string
  style?: string
  weight?: string | number | null
}

// 以指定的字型量測文字的寬度，完成後還原 ctx。未指定的項目取自圖表的全域字型
function withFont<T> (chart: Chart, font: Partial<ResolvedFont> | undefined, run: (measure: (part: string) => number) => T): T {
  const base = chart.options.font as ResolvedFont
  const size = font?.size ?? base.size
  const ctx = chart.ctx
  ctx.save()
  ctx.font = [font?.style ?? base.style, font?.weight ?? base.weight, `${size}px`, font?.family ?? base.family].filter(Boolean).join(' ')
  const result = run(part => ctx.measureText(part).width)
  ctx.restore()
  return result
}

// 圖例的文字依 Chart.js 分給圖例的寬度換行。Chart.js 於呼叫 generateLabels 之前已設定圖例的 maxWidth
function wrapLegend (chart: Chart, items: LegendItem[]): LegendItem[] {
  const legend = (chart as unknown as { legend?: { maxWidth?: number, options: { labels: { padding: number, font?: Partial<ResolvedFont> } } } }).legend
  if (!legend?.maxWidth) {
    return items
  }
  const { padding, font } = legend.options.labels
  const size = font?.size ?? (chart.options.font as ResolvedFont).size
  // 圖例的寬為留白、色塊、色塊與文字的間距與文字。Chart.js 於直排的圖例另加 10px
  const width = legend.maxWidth - padding - 10 - LEGEND_BOX_WIDTH - size / 2
  return withFont(chart, font, measure => items.map(item => ({ ...item, text: wrapText(item.text, width, measure) as string })))
}

// 分組軸的名稱依軸的寬度換行，用於橫向的長條圖。Chart.js 於此 hook 之前已設定軸的 maxWidth，之後才量測名稱的大小
function wrapAxisLabels (scale: Scale): void {
  const { grid, ticks } = scale.options as unknown as { grid: { tickLength: number }, ticks: { padding: number, font?: Partial<ResolvedFont> } }
  const width = scale.maxWidth - grid.tickLength - ticks.padding
  withFont(scale.chart, ticks.font, measure => {
    for (const tick of scale.ticks) {
      tick.label = typeof tick.label === 'string' ? wrapText(tick.label, width, measure) : tick.label
    }
  })
}

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

// 依名稱上色：指定的使用指定的顏色，其餘從上一個顏色之後輪流，跳過已指定的顏色（見 docs/topics/chart.md 的「顏色」）
export function paletteColors (names: readonly string[], pinned: ChartColors): string[] {
  const taken = new Set(names.map(name => pinned[name]).filter(color => color !== undefined))
  // 七色皆已指定時不跳過
  const skip = taken.size < PALETTE_ORDER.length ? taken : new Set<ColorName>()
  let next = 0
  return names.map(name => {
    let color = pinned[name]
    if (!color) {
      let index = next % PALETTE_ORDER.length
      while (skip.has(PALETTE_ORDER[index]!)) {
        index = (index + 1) % PALETTE_ORDER.length
      }
      color = PALETTE_ORDER[index]!
    }
    next = PALETTE_ORDER.indexOf(color) + 1
    return CHART_PALETTE[color]
  })
}

// 沒被選的部分調淡。opacity 為照常時的不透明度
function shade (color: string, on: boolean, opacity = 1): string {
  if (on && opacity === 1) {
    return color
  }
  return withAlpha(color, on ? opacity : opacity * DIM_OPACITY)
}

// 軸上的值皆為整數時，刻度只取整數
function tickPrecision (values: readonly (number | null)[]) {
  return values.every(value => value === null || Number.isInteger(value)) ? { precision: 0 } : {}
}

function axisStyle (theme: ChartTheme, unit: ChartUnit, values: readonly (number | null)[]) {
  return {
    grid: { color: theme.grid },
    ticks: { color: theme.text, callback: (value: number | string) => formatValue(Number(value), unit), ...tickPrecision(values) },
  }
}

// 設定所需的 defineChart 結果
type ChartShape = Pick<ChartDefinition<object>, 'type' | 'stacked' | 'horizontal' | 'colors'>

function categoryConfig (definition: ChartShape, data: Extract<ChartData<object>, { kind: 'category' }>, theme: ChartTheme, marks: ChartMarks): ChartConfiguration {
  const type = definition.type
  const round = ['pie', 'doughnut', 'polarArea'].includes(type)
  // 只有一個 dataset 的長條圖與圓餅類相同，依組上色
  const groupBar = type === 'bar' && data.datasets.length === 1 && !data.datasets[0]?.type
  const byGroup = round || groupBar
  // 依組上色時為各組的顏色，否則為各 dataset 的顏色
  const palette = paletteColors(byGroup ? data.groups.map(group => group.colorKey) : data.datasets.map(dataset => dataset.colorKey), definition.colors)
  const colorAt = (index: number) => palette[index] ?? ''
  const hasRight = data.datasets.some(dataset => dataset.axis === 'right')
  const groupOn = (groupIndex: number) => marks.groups?.[groupIndex] ?? true
  const datasetOn = (index: number) => marks.datasets?.[index] ?? true
  const datasetShown = (index: number) => marks.shown?.[index] ?? true

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
      hidden: !datasetShown(index),
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
        generateLabels: () => data.datasets.map((dataset, index) => ({
          text: dataset.label,
          fillStyle: shade(colorAt(index), datasetOn(index) && datasetShown(index), FILL_OPACITY),
          strokeStyle: shade(colorAt(index), datasetOn(index) && datasetShown(index)),
          lineWidth: 1,
          datasetIndex: index,
          fontColor: theme.text,
        })),
      },
    }
  }

  const leftUnit = data.datasets.find(dataset => dataset.axis !== 'right')?.unit ?? 'number'
  const rightUnit = data.datasets.find(dataset => dataset.axis === 'right')?.unit ?? 'number'
  const unitOf = (datasetIndex: number) => data.datasets[datasetIndex]?.unit ?? 'number'
  const leftValues = data.datasets.filter(dataset => dataset.axis !== 'right').flatMap(dataset => dataset.data)
  const rightValues = data.datasets.filter(dataset => dataset.axis === 'right').flatMap(dataset => dataset.data)

  let scales = {}
  if (type === 'bar' || type === 'line') {
    const valueAxis = definition.horizontal ? 'x' : 'y'
    const indexAxis = definition.horizontal ? 'y' : 'x'
    // 直的數值軸使用刻度間距有下限的軸
    const valueType = definition.horizontal ? {} : { type: SPACED_SCALE }
    scales = {
      [indexAxis]: {
        stacked: definition.stacked,
        grid: { color: theme.grid },
        ticks: { color: theme.text },
        ...(definition.horizontal ? { afterTickToLabelConversion: wrapAxisLabels } : {}),
      },
      // display 為 auto：軸上沒有顯示的 dataset 時隱藏該軸
      [valueAxis]: { ...valueType, display: 'auto', stacked: definition.stacked, beginAtZero: true, ...axisStyle(theme, leftUnit, leftValues) },
      ...(hasRight
        ? { right: { ...valueType, display: 'auto', position: definition.horizontal ? 'top' : 'right', beginAtZero: true, ...axisStyle(theme, rightUnit, rightValues), grid: { drawOnChartArea: false } } }
        : {}),
    }
  } else if (type === 'radar' || type === 'polarArea') {
    scales = {
      r: {
        beginAtZero: true,
        grid: { color: theme.grid },
        angleLines: { color: theme.grid },
        pointLabels: { color: theme.text },
        ticks: { color: theme.text, backdropColor: 'transparent', callback: (value: number | string) => formatValue(Number(value), leftUnit), ...tickPrecision(leftValues) },
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

  const palette = paletteColors(data.datasets.map(dataset => dataset.colorKey), definition.colors)
  const datasets = data.datasets.map((dataset, index) => {
    const color = palette[index] ?? ''
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
        x: { type: 'linear', ...axisStyle(theme, data.xUnit, data.datasets.flatMap(dataset => dataset.data.map(point => point.x))) },
        y: { type: SPACED_SCALE, ...axisStyle(theme, data.yUnit, data.datasets.flatMap(dataset => dataset.data.map(point => point.y))) },
      },
      plugins: {
        // 與分組類的圖表相同，圖例列出各 dataset，只有一個 dataset 時不顯示
        legend: {
          display: data.datasets.length > 1,
          labels: {
            generateLabels: (chart: Chart) => data.datasets.map((dataset, index) => {
              const on = marks.datasets?.[index] ?? true
              return {
                text: dataset.label,
                fillStyle: shade(palette[index] ?? '', on, FILL_OPACITY),
                strokeStyle: shade(palette[index] ?? '', on),
                lineWidth: 1,
                hidden: !chart.isDatasetVisible(index),
                datasetIndex: index,
                fontColor: theme.text,
              }
            }),
          },
        },
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
  const labels = plugins?.legend?.labels
  const generate = labels?.generateLabels
  config.options = {
    ...config.options,
    responsive: true,
    maintainAspectRatio: false,
    color: theme.text,
    plugins: {
      ...plugins,
      legend: {
        ...plugins?.legend,
        labels: {
          ...labels,
          color: theme.text,
          boxWidth: LEGEND_BOX_WIDTH,
          // 各種圖表的圖例文字皆依寬度換行
          ...(generate ? { generateLabels: (chart: Chart) => wrapLegend(chart, generate(chart)) } : {}),
        },
      },
    },
  }
  return config
}
