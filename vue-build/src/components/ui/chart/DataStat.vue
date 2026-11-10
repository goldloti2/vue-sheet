<script generic="Row extends object" lang="ts" setup>
  import type { ChartDefinition, ChartGroupData } from '@/schema/chart'
  import type { Filters } from '@/schema/filter'
  import { computed, inject, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
  import { COLS, dashboardKey, GAP } from '@/components/ui/panel/dashboardContext'
  import { useCompactLayout } from '@/composables/shell/useCompactLayout'
  import { usePanelBordered } from '@/composables/shell/usePanelActive'
  import { highlightOf } from '@/schema/chart'
  import { DIM_OPACITY, formatParts, paletteColors } from './chartConfig'

  // 以文字顯示 type 為 stat 的圖表：每一組的每一個數值為一格（見 docs/components/chart/DataStat.md）
  const { chart, rows, filters = {}, clickable = true } = defineProps<{
    chart: ChartDefinition<Row>
    rows: readonly Row[]
    // 篩選條件。分組欄上的條件以高光標示
    filters?: Filters
    // false：點擊沒有反應
    clickable?: boolean
  }>()

  const emit = defineEmits<{
    // 點擊一格，與 DataChart 點擊一組相同。stat 沒有系列，series 一律為 null
    group: [group: ChartGroupData<Row>, series: null]
  }>()

  const dashboard = inject(dashboardKey, null)
  // 位於有外框的面板中時，格子以面板的外框為框
  const bordered = usePanelBordered()
  const compact = useCompactLayout()
  const space = dashboard?.gap ?? GAP

  // 量測自身的寬度。KeepAlive 收起頁面時 DOM 不在文件中，不量測
  const root = useTemplateRef('root')
  const width = shallowRef(0)
  const observer = new ResizeObserver(() => {
    if (root.value?.isConnected) {
      width.value = root.value.clientWidth
    }
  })
  onMounted(() => {
    if (root.value) {
      observer.observe(root.value)
    }
  })
  onBeforeUnmount(() => observer.disconnect())

  // 一格的邊長：dashboard 中為 dashboard 的格子。不在 dashboard 中時，自身的寬度依手機或電腦的格數等分
  const unit = computed(() => {
    if (dashboard) {
      return Math.max(dashboard.cellSize.value, 0)
    }
    const cols = compact.value ? COLS.mobile : COLS.desktop
    return Math.max((width.value - (cols - 1) * space) / cols, 0)
  })

  const sizeStyle = computed(() => ({
    '--data-stat-unit': `${unit.value}px`,
    '--data-stat-space': `${space}px`,
  }))

  interface StatCell {
    key: string
    title: string
    // 有分組又有多個數值時，為數值的名稱
    caption: string | null
    value: string
    // 單位，例如「%」。沒有單位時為空字串
    suffix: string
    // 數字與單位的顏色 class。沒有指定時為 null
    textClass: string | null
    color: string
    on: boolean
    // 可點擊時為該組
    group: ChartGroupData<Row> | null
  }

  const cells = computed<StatCell[]>(() => {
    const data = chart.compute(rows)
    if (data.kind !== 'category') {
      return []
    }
    const grouped = chart.groupKey !== null
    const marks = highlightOf(data.groups, chart.groupKey, filters)
    // 有分組時依組上色，否則依數值上色
    const palette = paletteColors(grouped ? data.groups.map(group => group.colorKey) : data.datasets.map(dataset => dataset.colorKey), chart.colors)
    return data.groups.flatMap((group, groupIndex) => data.datasets.map((dataset, datasetIndex) => {
      const value = dataset.data[groupIndex] ?? null
      const { text, suffix } = formatParts(value, dataset.unit, dataset)
      const textColor = typeof dataset.textColor === 'function' ? dataset.textColor(value) : dataset.textColor
      return {
        key: `${groupIndex}-${datasetIndex}`,
        title: grouped ? data.labels[groupIndex] ?? '' : dataset.label,
        caption: grouped && data.datasets.length > 1 ? dataset.label : null,
        value: text || '—',
        suffix: text ? suffix : '',
        textClass: textColor ? `text-vuesheet-${textColor}` : null,
        color: palette[grouped ? groupIndex : datasetIndex] ?? '',
        on: marks?.[groupIndex] ?? true,
        group: clickable && grouped && group.rows.length > 0 ? group : null,
      }
    }))
  })
</script>

<template>
  <div ref="root" class="data-stat" :class="{ 'data-stat--bordered': bordered }" :style="sizeStyle">
    <component
      :is="cell.group ? 'button' : 'div'"
      v-for="cell in cells"
      :key="cell.key"
      class="data-stat__cell"
      :class="{ 'data-stat__cell--clickable': cell.group }"
      :style="{ '--data-stat-color': cell.color, opacity: cell.on ? 1 : DIM_OPACITY }"
      :type="cell.group ? 'button' : undefined"
      @click="cell.group && emit('group', cell.group, null)"
    >
      <span class="data-stat__name text-body-medium text-medium-emphasis">
        <span>{{ cell.title }}</span>
        <span v-if="cell.caption" class="data-stat__caption">{{ cell.caption }}</span>
      </span>

      <span class="data-stat__value" :class="cell.textClass">
        <span class="data-stat__number text-title-large font-weight-bold">{{ cell.value }}</span>
        <span v-if="cell.suffix" class="text-body-medium">{{ cell.suffix }}</span>
      </span>
    </component>
  </div>
</template>

<style scoped>
/* 格的大小見 docs/design/chart.md 的「文字統計」與「尺寸與樣式」。--data-stat-unit 與 --data-stat-space 由 script 指定，--data-stat-inset 由外層指定 */
/* 算式為格數加間隔，扣除兩側的留白與外框 2px。再少 1px，避免小數誤差產生捲軸 */
.data-stat {
  display: grid;
  grid-template-columns: repeat(auto-fit, max(1px, calc(6 * var(--data-stat-unit) + 5 * var(--data-stat-space) - 2 * var(--data-stat-inset, 0px) - 3px)));
  grid-auto-rows: max(1px, calc(2 * var(--data-stat-unit) + 1 * var(--data-stat-space) - 2 * var(--data-stat-inset, 0px) - 3px));
  gap: 4px;
  justify-content: center;
}

/* 左側的細色塊與圖表的組同色。名稱在上，數值在下，皆靠左，整組垂直置中 */
.data-stat__cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 0 8px 0 22px;
  overflow: hidden;
  color: inherit;
  text-align: start;
  background: none;
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left: 4px solid var(--data-stat-color);
  border-radius: 8px;
  transition: opacity 0.2s;
}

/* 位於有外框的面板中：格子只保留左側的色塊，以面板的外框為框，色塊貼齊面板的邊 */
.data-stat--bordered .data-stat__cell {
  border-top: none;
  border-right: none;
  border-bottom: none;
  border-radius: 0;
}

.data-stat__cell--clickable {
  cursor: pointer;
}

/* 名稱較長時換行，沒有空白的長字串也可於任意處換行 */
.data-stat__name {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.data-stat__caption {
  font-size: 0.85em;
}

/* 數字與單位為一組，單位與名稱同字級，底部與數字對齊 */
.data-stat__value {
  display: flex;
  align-items: baseline;
  white-space: nowrap;
}

/* 行高縮小，名稱與數字兩行放得進一格 */
.data-stat__number {
  line-height: 1.2;
}

/* 數字與單位的下緣止於基線，基線下方的空白不計入垂直置中 */
.data-stat__value > * {
  text-box: trim-end text alphabetic;
}
</style>
