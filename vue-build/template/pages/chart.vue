<!-- 複製到 src/pages/__table__-chart.vue（檔名可自訂）
     版型見 docs/components/page/ChartPage.md，宣告方式與計算規則見 docs/topics/chart.md。
     外觀與用途見 docs/design/chart.md -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/tables/__table__'
  import ChartPage from '@/components/ui/page/ChartPage.vue'
  import { useListPage } from '@/composables/page/useListPage'
  import { defineChart } from '@/schema/chart'
  import { __table__Schema } from '@/schema/tables/__table__'

  // 各狀態的列數與金額的總和。可填的項目依 type 而定，type 為 'stat' 時以文字顯示
  // stat 也可為以一組的列與 { index, groups } 為參數、回傳數值的函數，此時 label 必填
  const chart = defineChart(__table__Schema, {
    type: 'bar',
    group: { key: 'status' },
    values: [{ stat: 'count' }, { stat: 'sum', key: 'amount', type: 'line', axis: 'right' }],
  })

  // 整表 → 篩選 → 搜尋（搜尋、篩選與排序按鈕自動登記至 App Bar）
  // 分組欄與系列欄的條件不篩選列，改由圖表加上高光
  const { rows, filters, loading, error } = useListPage<__Table__Row>('__table__', __table__Schema, {
    ignoreFilter: chart.filterKeys,
  })
</script>

<template>
  <!-- 載入狀態、高光、點擊後的詳細頁（含上一列、下一列的順序）與寫入的條件皆由 ChartPage 處理 -->
  <ChartPage
    v-model:filters="filters"
    :chart="chart"
    :error="error"
    :loading="loading"
    :rows="rows"
    table="__table__"
  />
</template>
