<script generic="Row extends { id: string }" lang="ts" setup>
  import type { TableKey } from '@/schema'
  import type { ChartDefinition, ChartGroupData } from '@/schema/chart'
  import { useRouter } from 'vue-router'
  import DataChart from '@/components/ui/chart/DataChart.vue'
  import PageState from '@/components/ui/page/PageState.vue'
  import { publishListOrder } from '@/composables/navigation/useListOrder'
  import { usePanelFullPage } from '@/composables/shell/usePanelActive'

  // 圖表的整頁版型：載入狀態，以及點擊後進入詳細頁（見 docs/components/page/ChartPage.md）
  const { table, chart, rows, loading = false, error = null } = defineProps<{
    table: TableKey
    chart: ChartDefinition<Row>
    // 已篩選、搜尋的列，通常為 useListPage 的 rows
    rows: readonly Row[]
    loading?: boolean
    error?: string | null
  }>()

  const router = useRouter()
  const fullPage = usePanelFullPage()

  // 進入一列的詳細頁，上一列、下一列在 ids 之間切換
  function open (id: string, ids: readonly string[]) {
    publishListOrder(table, ids)
    void router.push(`/${table}/${id}`)
  }

  // 沒有列的組（例如沒有資料的區間）不換頁
  function onGroup (group: ChartGroupData<Row>) {
    const first = group.rows[0]
    if (first) {
      open(first.id, group.rows.map(row => row.id))
    }
  }

  function onRow (row: Row) {
    open(row.id, [row.id])
  }
</script>

<template>
  <v-container class="chart-page" :class="{ 'chart-page--panel': !fullPage }">
    <div class="chart-page__chart">
      <PageState :error="error" :loading="loading" spinner="linear">
        <DataChart :chart="chart" :rows="rows" @group="onGroup" @row="onRow" />
      </PageState>
    </div>
  </v-container>
</template>

<style scoped>
/* 整頁時為 App Bar 與底部之間的高度。內距由 chart-page__chart 的留白取代 */
.chart-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100dvh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px));
  min-height: 280px;
  padding: 0;
}

/* 面板中為面板內容區的高度（見 DashboardPanel） */
.chart-page--panel {
  height: 100cqh;
}

/* 圖表置中，寬與高各為 90%，四邊各留白 5% */
.chart-page__chart {
  width: 90%;
  height: 90%;
}
</style>
