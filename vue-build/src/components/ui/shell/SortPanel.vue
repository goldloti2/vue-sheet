<script lang="ts" setup>
  import type { ListTable } from '@/composables/shell/useListControls'
  import type { AnyColumn } from '@/schema/types'
  import { mdiArrowDown, mdiArrowUp } from '@mdi/js'
  import { computed, shallowRef, watch } from 'vue'
  import TableChips from '@/components/ui/shell/TableChips.vue'
  import { sortableColumns } from '@/schema/sort'

  const props = defineProps<{
    // 跟篩選面板同一批表；只列有給 sort 的那些
    tables: ListTable[]
    // 頁面的頁籤，沒被使用者換過就跟著它
    current?: string
    // 抽屜是 AppShell 的，這裡只用來在關起來時回到原狀
    open: boolean
  }>()

  const picked = shallowRef<string | null>(null)

  const table = computed(() => props.tables.find(item => item.schema.tableLabel === (picked.value ?? props.current)) ?? props.tables[0])

  watch(() => props.open, value => {
    if (!value) {
      picked.value = null
    }
  })

  const tableName = computed({
    get: () => table.value?.schema.tableLabel ?? '',
    set: value => {
      picked.value = value
    },
  })

  const columns = computed(() => table.value ? sortableColumns(table.value.schema) : [])

  // null 就是照 schema.defaultSort
  const sort = computed(() => table.value?.sort?.value ?? null)

  // 改了即時生效，沒有套用鈕。點同一欄換方向，點別欄從小到大開始
  function pick (column: AnyColumn) {
    if (!table.value?.sort) {
      return
    }
    const current = sort.value
    table.value.sort.value = current?.key === column.key
      ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key: column.key, direction: 'asc' }
  }

  // 清掉就是回到 schema.defaultSort，跟篩選那顆「清除」同一個位置、同一個意思
  function clear () {
    if (table.value?.sort) {
      table.value.sort.value = null
    }
  }
</script>

<template>
  <v-toolbar density="compact" flat title="排序">
    <v-btn text="清除" variant="text" @click="clear" />
  </v-toolbar>

  <TableChips v-model="tableName" :tables="tables" />

  <v-list v-if="columns.length > 0" density="compact">
    <v-list-item
      v-for="column in columns"
      :key="column.key"
      :active="sort?.key === column.key"
      :title="column.label"
      @click="pick(column)"
    >
      <template #append>
        <v-icon
          v-if="sort?.key === column.key"
          color="primary"
          :icon="sort.direction === 'asc' ? mdiArrowUp : mdiArrowDown"
          size="small"
        />
      </template>
    </v-list-item>
  </v-list>

  <v-container v-else class="text-medium-emphasis">這張表沒有可排序的欄位</v-container>
</template>
