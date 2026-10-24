<!-- 選用：複製到 src/pages/__table__/_ref/__Table__List.vue
     只供其他頁面引用的列表（_ref/ 不產生路由），用於 TabPage 的頁籤（見 tab-list.vue）、dashboard 的面板或其他頁面。
     以 props 傳入條件，同一個元件可用於不同頁面。說明見 docs/topics/search.md 的「同一頁面中的多張表」 -->
<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/tables/__table__'
  import DataList from '@/components/ui/list/DataList.vue'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useListPage } from '@/composables/page/useListPage'
  import { useAppBarActions } from '@/composables/shell/useShellActions'
  import { __table__Schema } from '@/schema/tables/__table__'
  import { defineView } from '@/schema/view'

  // status：常用且意義固定的條件，定為專屬的 prop。scope：須任意條件時使用。兩者合併套用
  const { status, scope } = defineProps<{
    status?: string
    scope?: (row: __Table__Row) => boolean
  }>()

  // scope 於篩選與搜尋之前套用。判斷寫於函式內，prop 改變時才會重算
  const { rows, loading, error, selection } = useListPage<__Table__Row>('__table__', __table__Schema, {
    scope: row => (!status || row.status === status) && (!scope || scope(row)),
  })

  // 新增時預設為此列表的狀態。沒有 status 時不帶預設值
  const { new: newAction, bulkDelete } = use__Table__Actions({
    defaults: () => status ? { status } : {},
    selectedIds: selection.selectedIds,
    onDone: selection.clear,
  })
  useAppBarActions(() => [bulkDelete.value])

  // 每列四個角的欄位：title 左上、subtitle 右上、summary 左下、aside 右下
  const view = defineView(__table__Schema, { title: 'name', subtitle: 'date', summary: 'amount' })
</script>

<template>
  <!-- FAB、多選與列表順序各自計算。置於 TabPage 中時，只有目前頁籤的列表生效 -->
  <ListPage
    :error="error"
    :fab="[newAction]"
    :loading="loading"
    :rows="rows"
    :selection="selection"
    table="__table__"
  >
    <template #default="{ row, props: itemProps }">
      <DataList v-bind="itemProps" :row="row" :to="`/__table__/${row.id}`" :view="view" />
    </template>
  </ListPage>
</template>
