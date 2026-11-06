<script generic="Row extends object" lang="ts" setup>
  import type { ChartMarks, ChartTheme } from './chartConfig'
  import type { ChartDefinition, ChartGroupData, GroupFilter } from '@/schema/chart'
  import type { Filters } from '@/schema/filter'
  import type { Chart, LegendItem } from 'chart.js'
  import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
  import { useTheme } from 'vuetify'
  import { highlightOf, shownDatasets, togglePicked } from '@/schema/chart'
  import { buildConfig, withAlpha } from './chartConfig'
  import { registerSpacedScale } from './chartScale'

  // 以 Chart.js 畫出 defineChart 的圖表（見 docs/topics/chart.md）
  const { chart, rows, filters = {}, clickable = true } = defineProps<{
    chart: ChartDefinition<Row>
    rows: readonly Row[]
    // 篩選條件。分組欄與系列欄上的條件以高光標示
    filters?: Filters
    // false：點擊圖表與圖例皆沒有反應，提示照常顯示
    clickable?: boolean
  }>()

  const emit = defineEmits<{
    // 點擊分組類圖表的一組。series 為點擊的 dataset 所屬的系列，沒有系列時為 null
    group: [group: ChartGroupData<Row>, series: ChartGroupData<Row> | null]
    // 點擊 scatter 或 bubble 的一點
    row: [row: Row]
    // 點擊圖例中的一組或一個系列，參數為選取它的條件
    legend: [pick: GroupFilter]
  }>()

  const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
  const data = computed(() => chart.compute(rows))

  // 圖例中勾選的 dataset（索引），只屬於這張圖，不寫入篩選
  const picked = shallowRef<ReadonlySet<number>>(new Set())

  // 符合分組欄條件的組、符合系列欄條件的 dataset。沒有系列的 dataset 依圖例的勾選顯示
  const marks = computed<ChartMarks>(() => {
    const current = data.value
    const series = highlightOf(current.series, chart.seriesKey, filters)
    const datasets: { series?: number }[] = current.datasets
    return {
      groups: current.kind === 'category' ? highlightOf(current.groups, chart.groupKey, filters) : null,
      datasets: series && datasets.map(dataset => dataset.series === undefined || series[dataset.series] === true),
      shown: shownDatasets(datasets, picked.value),
    }
  })

  const vuetifyTheme = useTheme()
  const theme = computed<ChartTheme>(() => {
    // 主題中的顏色皆為 #rrggbb 字串
    const color = (name: string, fallback: string) => {
      const value = vuetifyTheme.current.value.colors[name]
      return typeof value === 'string' ? value : fallback
    }
    return {
      text: withAlpha(color('on-surface', '#000000'), 0.7),
      grid: withAlpha(color('on-surface', '#000000'), 0.12),
      surface: color('surface', '#ffffff'),
    }
  })

  // Chart.js 的實例刻意不放進 ref，Chart.js 會修改自己的物件
  let instance: Chart | null = null
  let unmounted = false

  function onClick (_event: unknown, elements: { datasetIndex: number, index: number }[]) {
    const element = elements[0]
    if (!element) {
      return
    }
    const current = data.value
    if (current.kind === 'category') {
      const group = current.groups[element.index]
      const series = current.datasets[element.datasetIndex]?.series
      if (group) {
        emit('group', group, series === undefined ? null : current.series[series] ?? null)
      }
      return
    }
    const point = current.datasets[element.datasetIndex]?.data[element.index]
    if (point) {
      emit('row', point.row)
    }
  }

  // 圖例的一項為一組或一個系列時發出條件。沒有系列的 dataset 切換勾選
  function onLegend (_event: unknown, item: LegendItem) {
    const current = data.value
    const index = item.datasetIndex
    if (index === undefined) {
      const filter = current.kind === 'category' && item.index !== undefined ? current.groups[item.index]?.filter : null
      if (filter) {
        emit('legend', filter)
      }
      return
    }
    const datasets: { series?: number }[] = current.datasets
    const series = datasets[index]?.series
    if (series === undefined) {
      picked.value = togglePicked(picked.value, index)
      return
    }
    const filter = current.series[series]?.filter
    if (filter) {
      emit('legend', filter)
    }
  }

  // 圖例的位置依圖表的比例：寬至少為高的 WIDE_RATIO 倍時置於右側，否則置於上方
  const WIDE_RATIO = 1.2
  let legendPosition: 'top' | 'right' = 'top'

  function positionFor (width: number, height: number): 'top' | 'right' {
    return width >= height * WIDE_RATIO ? 'right' : 'top'
  }

  // Chart.js 於改變大小後自行更新，此處只換上新的位置
  function onResize (resized: Chart, size: { width: number, height: number }) {
    legendPosition = positionFor(size.width, size.height)
    const legend = resized.options.plugins?.legend
    if (legend) {
      legend.position = legendPosition
    }
  }

  function config () {
    const built = buildConfig(chart, data.value, theme.value, marks.value)
    const plugins = built.options?.plugins
    // 不可點擊時，圖例也不切換勾選
    built.options = {
      ...built.options,
      onClick: clickable ? onClick : undefined,
      onResize,
      plugins: { ...plugins, legend: { ...plugins?.legend, position: legendPosition, onClick: clickable ? onLegend : () => {} } },
    }
    return built
  }

  // Chart.js 於掛載時才載入，沒有圖表的頁面不下載
  onMounted(async () => {
    const { default: ChartJs, LinearScale } = await import('chart.js/auto')
    if (unmounted || !canvas.value) {
      return
    }
    registerSpacedScale(ChartJs, LinearScale)
    const box = canvas.value.parentElement?.getBoundingClientRect()
    if (box) {
      legendPosition = positionFor(box.width, box.height)
    }
    instance = new ChartJs(canvas.value, config())
  })

  // 沿用原本的 dataset 物件，只換上新的屬性。Chart.js 依物件辨認 dataset，換成新的物件時整張圖重畫
  function patchDatasets (current: Record<string, unknown>[], next: Record<string, unknown>[]) {
    for (const [index, dataset] of next.entries()) {
      const existing = current[index]
      if (!existing) {
        current.push(dataset)
        continue
      }
      for (const key of Object.keys(existing)) {
        if (!(key in dataset)) {
          Reflect.deleteProperty(existing, key)
        }
      }
      Object.assign(existing, dataset)
    }
    current.length = next.length
  }

  // 資料、高光或主題改變時，換上新的設定並更新。顏色與數值由原本的狀態過渡
  watch([data, marks, theme], () => {
    if (!instance) {
      return
    }
    const next = config()
    instance.data.labels = next.data.labels
    patchDatasets(
      instance.data.datasets as unknown as Record<string, unknown>[],
      next.data.datasets as unknown as Record<string, unknown>[],
    )
    instance.options = next.options ?? {}
    instance.update()
  })

  onBeforeUnmount(() => {
    unmounted = true
    instance?.destroy()
    instance = null
  })
</script>

<template>
  <div class="data-chart">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
/* 高度隨所在的容器，由外層指定。Chart.js 依此容器的大小重畫 */
.data-chart {
  position: relative;
  height: 100%;
}
</style>
