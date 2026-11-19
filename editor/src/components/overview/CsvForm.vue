<script lang="ts" setup>
  import { mdiAlertOutline } from '@mdi/js'
  import { computed } from 'vue'
  import { useFilesStore } from '@/stores/files'
  import { checkHeaders, parseCsv } from '../../../shared/csv'
  import { tableOfCsv } from '../../../shared/tableFiles'

  const props = defineProps<{
    path: string
    text: string
  }>()

  const files = useFilesStore()

  const rows = computed(() => parseCsv(props.text))
  const headers = computed(() => rows.value[0] ?? [])
  const body = computed(() => rows.value.slice(1))

  const tableKey = computed(() => tableOfCsv(props.path, files.mockCsv, Object.keys(files.tables)))
  const table = computed(() => tableKey.value === null ? null : files.tables[tableKey.value] ?? null)
  // 表的真實欄位的 Sheet 表頭
  const check = computed(() => table.value
    ? checkHeaders(headers.value, table.value.columns.flatMap(column => column.header === null ? [] : [column.header]))
    : null)
  const unknown = computed(() => new Set(check.value?.unknown))
</script>

<template>
  <div class="csv-form">
    <div class="csv-form__notices">
      <v-alert
        v-if="!table"
        density="compact"
        text="這個 CSV 沒有對應的表，表頭不比對。"
        type="info"
        variant="tonal"
      />

      <v-alert
        v-if="check && check.missing.length > 0"
        density="compact"
        :icon="mdiAlertOutline"
        :text="`schema 中有、CSV 中沒有的表頭：${check.missing.join('、')}`"
        type="warning"
        variant="tonal"
      />

      <v-alert
        v-if="check && check.unknown.length > 0"
        density="compact"
        :icon="mdiAlertOutline"
        text="標為警告色的表頭不在 schema 中，本地測試不會讀取這一欄。"
        type="warning"
        variant="tonal"
      />
    </div>

    <table class="csv-form__table">
      <thead>
        <tr>
          <th class="csv-form__index" />

          <th
            v-for="(header, column) in headers"
            :key="column"
            :class="{ 'csv-form__header--unknown': unknown.has(header) }"
          >
            {{ header }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, index) in body" :key="index">
          <td class="csv-form__index">{{ index + 1 }}</td>
          <td v-for="(_header, column) in headers" :key="column">{{ row[column] ?? '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.csv-form {
  height: 100%;
  overflow: auto;
}

.csv-form__notices {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.csv-form__notices:empty {
  display: none;
}

.csv-form__table {
  min-width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.csv-form__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 4px 8px;
  background: rgb(var(--v-theme-surface));
  font-weight: normal;
  text-align: left;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.csv-form__table .csv-form__header--unknown {
  color: rgb(var(--v-theme-warning));
}

.csv-form__table td {
  height: 32px;
  padding: 0 8px;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: nowrap;
  vertical-align: middle;
}

/* 列號為淡色，靠右 */
.csv-form__table .csv-form__index {
  text-align: right;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
