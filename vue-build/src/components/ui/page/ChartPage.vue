<script generic="Row extends { id: string }" lang="ts" setup>
  import type { TableKey } from '@/schema'
  import type { ChartDefinition, ChartGroupData, GroupFilter } from '@/schema/chart'
  import type { Filters } from '@/schema/filter'
  import { watch } from 'vue'
  import { useRouter } from 'vue-router'
  import DataChart from '@/components/ui/chart/DataChart.vue'
  import DataStat from '@/components/ui/chart/DataStat.vue'
  import PageState from '@/components/ui/page/PageState.vue'
  import { publishListOrder } from '@/composables/navigation/useListOrder'
  import { useDashboardPanel } from '@/composables/shell/useDashboardLinks'
  import { usePanelBordered, usePanelFullPage, usePanelVisible } from '@/composables/shell/usePanelActive'
  import { pickElement, toggleLegend } from '@/schema/chart'

  // 圖表的整頁版型：載入狀態、高光，以及點擊後進入詳細頁或寫入條件（見 docs/components/page/ChartPage.md）
  const { table, chart, rows, loading = false, error = null, clickable = true } = defineProps<{
    table: TableKey
    chart: ChartDefinition<Row>
    // 已篩選、搜尋的列，通常為 useListPage 的 rows
    rows: readonly Row[]
    loading?: boolean
    error?: string | null
    // false：點擊圖表與圖例皆沒有反應，不進入詳細頁，也不寫入條件
    clickable?: boolean
  }>()

  // 該表的篩選條件，通常為 useListPage 的 filters。分組欄與系列欄上的條件以高光標示，點擊圖例與加入共用的儀表板面板中的點擊寫入此處
  const filters = defineModel<Filters>('filters', { default: () => ({}) })

  const router = useRouter()
  const fullPage = usePanelFullPage()
  // 位於有外框的面板中時，stat 沒有外圍留白
  const bordered = usePanelBordered()

  // dashboard 的面板中，輸出圖表所用的列，不輸出選取。頁籤中的圖表只在目前的頁籤時輸出，載入中不輸出
  const panel = useDashboardPanel()
  const visible = usePanelVisible()
  if (panel) {
    watch([visible, () => loading, () => rows], ([isVisible, isLoading, shownRows]) => {
      if (isVisible && !isLoading) {
        panel.show(table, shownRows.map(row => row.id))
      }
    }, { immediate: true })
  }

  // 進入一列的詳細頁，上一列、下一列在 ids 之間切換
  function open (id: string, ids: readonly string[]) {
    publishListOrder(table, ids)
    void router.push(`/${table}/${id}`)
  }

  // 加入共用的 dashboard 面板中寫入這一組與其系列的條件，否則進入詳細頁。沒有列的組（例如沒有資料的區間）不換頁
  function onGroup (group: ChartGroupData<Row>, series: ChartGroupData<Row> | null) {
    if (panel?.shared()) {
      if (group.filter) {
        filters.value = pickElement(filters.value, series?.filter ? [group.filter, series.filter] : [group.filter])
      }
      return
    }
    const first = group.rows[0]
    if (first) {
      open(first.id, group.rows.map(row => row.id))
    }
  }

  function onLegend (pick: GroupFilter) {
    filters.value = toggleLegend(filters.value, pick)
  }

  function onRow (row: Row) {
    open(row.id, [row.id])
  }
</script>

<template>
  <!-- stat 以文字顯示，高度隨內容，不使用 Chart.js -->
  <div v-if="chart.type === 'stat'" class="chart-page-stat" :class="{ 'chart-page-stat--bordered': bordered }">
    <PageState :error="error" :loading="loading" spinner="linear">
      <DataStat
        :chart="chart"
        :clickable="clickable"
        :filters="filters"
        :rows="rows"
        @group="onGroup"
      />
    </PageState>
  </div>

  <v-container v-else class="chart-page" :class="{ 'chart-page--panel': !fullPage }">
    <div class="chart-page__chart">
      <PageState :error="error" :loading="loading" spinner="linear">
        <DataChart
          :chart="chart"
          :clickable="clickable"
          :filters="filters"
          :rows="rows"
          @group="onGroup"
          @legend="onLegend"
          @row="onRow"
        />
      </PageState>
    </div>
  </v-container>
</template>

<style scoped>
/* stat 的外圍留白，以 --data-stat-inset 告知 DataStat，供其計算格的大小（見 docs/design/chart.md 的「尺寸與樣式」） */
.chart-page-stat {
  --data-stat-inset: 4px;

  padding: var(--data-stat-inset);
}

.chart-page-stat--bordered {
  --data-stat-inset: 0px;
}

/* 整頁時為 App Bar 與底部之間的高度。內距由 chart-page__chart 的留白取代 */
.chart-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100dvh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px));
  min-height: 280px;
  padding: 0;
}

/* 面板中為面板內容區的高度（見 DashboardPanel），不設最小高度 */
.chart-page--panel {
  height: 100cqh;
  min-height: 0;
}

/* 圖表置中，四邊留白（見 docs/design/chart.md 的「尺寸與樣式」） */
.chart-page__chart {
  width: 90%;
  height: 90%;
}
</style>
