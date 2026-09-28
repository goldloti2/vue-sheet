<script lang="ts" setup generic="Row extends { id: string }">
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { MultiSelect } from '@/composables/list/useMultiSelect'
  import type { TableKey } from '@/schema'
  import type { RowGroup } from '@/schema/types'
  import { computed } from 'vue'
  import GroupedList from '@/components/ui/list/GroupedList.vue'
  import PageState from '@/components/ui/page/PageState.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { useListOrder } from '@/composables/navigation/useListOrder'
  import { flattenGroups } from '@/schema/types'

  const props = defineProps<{
    table: TableKey
    // 已經篩選、搜尋過的那些，也就是畫面上實際顯示的順序。分組的列表改給 groups
    rows?: Row[]
    // 分組（groupRows 的結果），跟 rows 二選一
    groups?: RowGroup<Row>[]
    loading?: boolean
    error?: string | null
    // 有給才綁長按多選（useListPage 的 selection）
    selection?: MultiSelect
    // 右下角的 FAB，通常是新增
    fab?: PageAction[]
  }>()

  defineSlots<{
    // props 是每一列的多選綁定，直接 v-bind 到 DataList 上
    default?: (slotProps: { row: Row, props: object }) => unknown
    // 整批一次給（表格式列表用）。有這個 slot 就不走上面那個，也沒有多選綁定
    rows?: (slotProps: { rows: Row[] }) => unknown
  }>()

  // 畫面上實際的順序，detail 頁的上/下一筆靠它。分組的話攤平才是真正的先後
  const shown = computed<Row[]>(() => props.groups ? flattenGroups(props.groups) : props.rows ?? [])
  useListOrder(props.table, () => shown.value.map(row => row.id))
</script>

<template>
  <div>
    <v-container>
      <PageState :error="error" :loading="loading" spinner="linear">
        <GroupedList v-if="groups" :groups="groups">
          <template #default="{ row }">
            <slot :props="selection?.itemProps(row.id) ?? {}" :row="row" />
          </template>
        </GroupedList>

        <slot v-else-if="$slots.rows" name="rows" :rows="rows ?? []" />

        <template v-for="row in rows" v-else :key="row.id">
          <slot :props="selection?.itemProps(row.id) ?? {}" :row="row" />
        </template>
      </PageState>
    </v-container>

    <PageFab :actions="fab ?? []" />
  </div>
</template>
