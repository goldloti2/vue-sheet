<script lang="ts" setup generic="Row extends RowBase">
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { TableKey } from '@/schema'
  import type { RowBase } from '@/schema/types'
  import { computed } from 'vue'
  import CountLabel from '@/components/ui/list/CountLabel.vue'
  import ListLayout from '@/components/ui/list/ListLayout.vue'
  import { provideListOrder } from '@/composables/navigation/useListOrder'
  import { useRunAction } from '@/composables/shell/useActionRunner'

  const props = withDefaults(defineProps<{
    title: string
    rows: readonly Row[]
    limit?: number
    to?: string
    actions?: (PageAction | null)[]
    emptyText?: string
  }>(), {
    limit: 5,
    emptyText: '還沒有資料',
  })

  defineSlots<{
    // 提供截斷後的子列：卡片由頁面自行 v-for，表格則整批交給 DataTable
    default?: (slotProps: { rows: Row[] }) => unknown
  }>()

  const shown = computed(() => props.limit > 0 ? props.rows.slice(0, props.limit) : [...props.rows])

  // 子列的表取自 $table，不是 store 的列時為 null
  function rowsTable (): TableKey | null {
    const table = props.rows[0]?.$table ?? null
    if (import.meta.env.DEV && table === null) {
      console.warn('[ChildList] 子列沒有 $table，點擊時不發布上一列、下一列的順序。rows 須為 store 的列')
    }
    return table
  }

  // 點擊一列時發布全部子列的順序，不只是截斷後顯示的列
  provideListOrder(rowsTable, () => props.rows.map(row => row.id))

  const shownActions = computed(() => (props.actions ?? []).filter(action => action !== null))

  const runAction = useRunAction()
</script>

<template>
  <!-- 子列與列表頁相同，貼齊畫面的左右，留白由內容決定（見 ListLayout）。標題、說明與按鈕留白 -->
  <v-container class="child-list">
    <div class="child-list__inset text-title-medium font-weight-bold mb-2">
      <CountLabel :count="rows.length" :label="title" />
    </div>

    <ListLayout v-if="rows.length > 0">
      <slot :rows="shown" />
    </ListLayout>

    <div v-else class="child-list__inset text-medium-emphasis">{{ emptyText }}</div>

    <div v-if="to || shownActions.length > 0" class="child-list__inset d-flex flex-wrap ga-2 justify-end mt-2">
      <v-btn v-if="to" text="展開" :to="to" variant="text" />

      <v-btn
        v-for="action in shownActions"
        :key="action.key"
        :text="action.label"
        variant="text"
        @click="runAction(action)"
      />
    </div>
  </v-container>
</template>

<style scoped>
.child-list {
  padding-inline: 0;
}

.child-list__inset {
  padding-inline: 16px;
}
</style>
