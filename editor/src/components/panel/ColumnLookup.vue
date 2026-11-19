<script lang="ts" setup>
  import type { TableSummary } from '../../../shared/api'
  import { computed, shallowRef, watch } from 'vue'

  const props = defineProps<{
    tables: Readonly<Record<string, TableSummary>>
    /** 目前的檔案所屬的表。改變時改為選取此表 */
    currentTableKey: string | null
  }>()

  const emit = defineEmits<{
    insert: [key: string]
  }>()

  const tableKeys = computed(() => Object.keys(props.tables).toSorted())
  const selected = shallowRef<string | null>(null)
  const columns = computed(() => selected.value === null ? [] : props.tables[selected.value]?.columns ?? [])

  watch(() => props.currentTableKey, key => {
    if (key !== null) {
      selected.value = key
    }
  }, { immediate: true })

  // ref 欄位指向的表，以表名顯示
  function refTitle (refTable: string | null): string {
    return refTable === null ? '' : `→ ${props.tables[refTable]?.label ?? refTable}`
  }

  // 選取的表被刪除或尚未選取時，改選第一張表
  watch(tableKeys, keys => {
    if (selected.value === null || !keys.includes(selected.value)) {
      selected.value = keys[0] ?? null
    }
  }, { immediate: true })
</script>

<template>
  <div v-if="tableKeys.length === 0" class="column-lookup__empty text-medium-emphasis">
    沒有表
  </div>

  <div v-else class="column-lookup">
    <v-list class="column-lookup__tables py-0" density="compact">
      <v-list-item
        v-for="key in tableKeys"
        :key="key"
        :active="key === selected"
        color="primary"
        @click="selected = key"
      >
        <v-list-item-title class="text-body-2">{{ tables[key]?.label ?? key }}</v-list-item-title>
        <v-list-item-subtitle class="text-caption">{{ key }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>

    <v-table class="column-lookup__columns" density="compact">
      <tbody>
        <tr v-for="column in columns" :key="column.key" class="column-lookup__row" @dblclick="emit('insert', column.key)">
          <td class="column-lookup__key">{{ column.key }}</td>
          <td>{{ column.label }}</td>
          <td>{{ column.type }}</td>
          <td class="text-medium-emphasis">{{ refTitle(column.refTable) }}</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<style scoped>
.column-lookup {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  height: 100%;
}

.column-lookup__empty {
  padding: 8px 16px;
}

.column-lookup__tables {
  overflow-y: auto;
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.column-lookup__columns {
  min-height: 0;
  overflow-y: auto;
  font-size: 0.75rem;
}

.column-lookup__row {
  cursor: pointer;
  user-select: none;
}

.column-lookup__key {
  font-family: monospace;
}
</style>
