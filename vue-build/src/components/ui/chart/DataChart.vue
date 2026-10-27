<script generic="Row extends object" lang="ts" setup>
  import type { ChartTheme } from './chartConfig'
  import type { ChartDefinition } from '@/schema/chart'
  import type { Chart } from 'chart.js'
  import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
  import { useTheme } from 'vuetify'
  import { sharedColorNames } from '@/plugins/vuetify'
  import { buildConfig, withAlpha } from './chartConfig'

  // 以 Chart.js 畫出 defineChart 的圖表（見 docs/topics/chart.md）
  const { chart, rows } = defineProps<{
    chart: ChartDefinition<Row>
    rows: readonly Row[]
  }>()

  const emit = defineEmits<{
    // 點擊分組類圖表的一組，index 對應 compute 結果的 groups
    group: [index: number]
    // 點擊 scatter 或 bubble 的一點
    row: [row: Row]
  }>()

  const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
  const data = computed(() => chart.compute(rows))

  const vuetifyTheme = useTheme()
  const theme = computed<ChartTheme>(() => {
    // 主題中的顏色皆為 #rrggbb 字串
    const color = (name: string, fallback: string) => {
      const value = vuetifyTheme.current.value.colors[name]
      return typeof value === 'string' ? value : fallback
    }
    return {
      colors: sharedColorNames.map(name => color(name, '#9e9e9e')),
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
      emit('group', element.index)
      return
    }
    const point = current.datasets[element.datasetIndex]?.data[element.index]
    if (point) {
      emit('row', point.row)
    }
  }

  function config () {
    const built = buildConfig(chart, data.value, theme.value)
    built.options = { ...built.options, onClick }
    return built
  }

  // Chart.js 於掛載時才載入，沒有圖表的頁面不下載
  onMounted(async () => {
    const { default: ChartJs } = await import('chart.js/auto')
    if (unmounted || !canvas.value) {
      return
    }
    instance = new ChartJs(canvas.value, config())
  })

  // 資料或主題改變時，換上新的設定並更新
  watch([data, theme], () => {
    if (!instance) {
      return
    }
    const next = config()
    instance.data = next.data
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
/* 高度隨所在的容器，至少 280px。Chart.js 依此容器的大小重畫 */
.data-chart {
  position: relative;
  height: 100%;
  min-height: 280px;
}
</style>
