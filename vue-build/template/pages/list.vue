<!-- 複製到 src/pages/__table__/index.vue -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import { computed } from 'vue'
  import DataList from '@/components/ui/list/DataList.vue'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useSortedTableList } from '@/composables/data/useSortedTableList'
  import { useListOrder } from '@/composables/navigation/useListOrder'
  import { __table__Schema } from '@/schema/__table__'
  import { formatField } from '@/schema/types'

  // 有多選的話補上 selectedIds 與 onDone，並把 bulkDelete 註冊到 app-bar：
  //   const { new: newActions, bulkDelete } = use__Table__Actions({ selectedIds, onDone: clearSelection })
  //   useAppBarActions(() => bulkDelete.value)
  // defaults 也可省略；要讓新增表單依當下頁面狀態預填時傳 getter
  const { new: newActions } = use__Table__Actions()

  const { data, loading, error } = useSortedTableList<__Table__Row>('__table__', __table__Schema)

  // 要搜尋列與篩選的話（哪些欄位能搜、能篩看 schema 的 searchable）：上面的 data 改名成 allRows，再
  //   const query = ref('')
  //   const filters = ref<Filters>({})
  //   useAppBarSearch(query, { tables: [{ schema: __table__Schema, filters, rows: allRows }] })
  //   const data = useSearch(query, useFilter(filters, allRows, __table__Schema), __table__Schema)

  useListOrder('__table__', computed(() => data.value.map(row => row.id)))
</script>

<template>
  <div>
    <v-container>
      <v-progress-linear v-if="loading" indeterminate />

      <v-alert v-else-if="error" :text="error" type="error" />

      <template v-if="!error">
        <DataList
          v-for="row in data"
          :key="row.id"
          :bottom-left="formatField(row, __table__Schema, 'amount')"
          :title="formatField(row, __table__Schema, 'name')"
          :to="`/__table__/${row.id}`"
          :top-right="formatField(row, __table__Schema, 'date')"
        />
      </template>
    </v-container>

    <PageFab :actions="newActions" />
  </div>
</template>
