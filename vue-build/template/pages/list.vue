<!-- 複製到 src/pages/__table__/index.vue
     版型與每列能放什麼見 docs/components/ListPage.md 與 DataList.md；
     搜尋、篩選、多選、分組與頁籤見 docs/ui.md -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import DataList from '@/components/ui/list/DataList.vue'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useListPage } from '@/composables/page/useListPage'
  import { useAppBarActions } from '@/composables/shell/useShellActions'
  import { __table__Schema } from '@/schema/__table__'
  import { formatField } from '@/schema/types'

  // 整表 → 篩選 → 搜尋（放大鏡與篩選鈕自動登記到 App Bar）+ 長按多選
  const { rows, loading, error, selection } = useListPage<__Table__Row>('__table__', __table__Schema)

  // 不要多選就不傳 selectedIds / onDone，也不用把 selection 交給 ListPage；
  // defaults 也可省略，要讓新增表單依當下頁面狀態預填時傳 getter
  const { new: newActions, bulkDelete } = use__Table__Actions({
    selectedIds: selection.selectedIds,
    onDone: selection.clear,
  })
  useAppBarActions(() => bulkDelete.value)
</script>

<template>
  <!-- 載入狀態、FAB、列表順序（detail 頁的上/下一筆）都由 ListPage 處理 -->
  <ListPage
    :error="error"
    :fab="newActions"
    :loading="loading"
    :rows="rows"
    :selection="selection"
    table="__table__"
  >
    <!-- 這張表自己的四個角；props 是每列多選要綁的那一包 -->
    <template #default="{ row, props: itemProps }">
      <DataList
        v-bind="itemProps"
        :bottom-left="formatField(row, __table__Schema, 'amount')"
        :title="formatField(row, __table__Schema, 'name')"
        :to="`/__table__/${row.id}`"
        :top-right="formatField(row, __table__Schema, 'date')"
      />
    </template>
  </ListPage>
</template>
