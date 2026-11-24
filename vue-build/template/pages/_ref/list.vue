<!-- 選用：複製到 src/pages/__table__/_ref/__Table__List.vue
     只供其他頁面引用的列表（_ref/ 不產生路由），用於 TabPage 的頁籤（見 tab-list.vue）、dashboard 的面板或其他頁面。
     以 props 傳入條件，同一個元件可用於不同頁面。說明見 docs/topics/search.md 的「同一頁面中的多張表」 -->
<script lang="ts" setup>
  import type { RowOf } from '@/schema/types'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { useActions } from '@/composables/actions'
  import { useListPage } from '@/composables/page/useListPage'
  import { defineView } from '@/schema/view'

  // status：常用且意義固定的條件，定為專屬的 prop。match：須其他條件時使用。兩者合併套用
  const { status, match: extraMatch } = defineProps<{
    status?: string
    match?: Partial<RowOf<'__table__'>>
  }>()

  // match 於篩選與搜尋之前套用，也作為新增時的預設值。條件寫於函式內，prop 改變時才會重算
  const { rows, loading, error, selection, match } = useListPage('__table__', {
    match: () => ({ status, ...extraMatch }),
  })

  const { new: newAction, bulkDelete } = useActions('__table__', { list: { selection, match } })

  // 每列四個角的欄位：title 左上、subtitle 右上、summary 左下、aside 右下
  const view = defineView('__table__', { title: 'name', subtitle: 'date', summary: 'amount' })
</script>

<template>
  <!-- FAB、多選與列表順序各自計算。置於 TabPage 中時，只有目前頁籤的列表生效 -->
  <ListPage
    :app-bar="[bulkDelete]"
    :error="error"
    :fab="[newAction]"
    item="list"
    :loading="loading"
    :row-to="row => `/__table__/${row.id}`"
    :rows="rows"
    :selection="selection"
    table="__table__"
    :view="view"
  />
</template>
