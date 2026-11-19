<script lang="ts" setup>
  import type { MockOverviewRow } from '../../../shared/overview'
  import type { MockTablesEdit } from '../../../shared/tableFiles'
  import { mdiPlus } from '@mdi/js'
  import { computed } from 'vue'
  import { editMockTables, parseMockTablesText } from '@/api'
  import { useParsedForm } from '@/composables/useParsedForm'
  import { useTableFiles } from '@/composables/useTableFiles'
  import { useFilesStore } from '@/stores/files'
  import { mockOverviewRows } from '../../../shared/overview'

  const props = defineProps<{
    path: string
    text: string
  }>()

  const files = useFilesStore()
  const tables = useTableFiles()
  const form = useParsedForm({
    path: () => props.path,
    text: () => props.text,
    parse: parseMockTablesText,
    edit: (text, edits: MockTablesEdit[]) => editMockTables({ text, edits }),
  })

  const rows = computed(() => form.model.value
    ? mockOverviewRows(form.model.value, { paths: files.paths, tables: files.tables, tableOrder: files.tableOrder, csvRows: files.csvRows })
    : [])

  function fileName (path: string): string {
    return path.slice(path.lastIndexOf('/') + 1)
  }

  // 打開即加上登記，關掉即刪除登記
  function setRegistered (row: MockOverviewRow, registered: boolean): void {
    if (row.key === null) {
      return
    }
    if (registered && row.csv !== null) {
      void form.apply([{ kind: 'add', key: row.key, csvPath: row.csv }])
    } else if (!registered) {
      void form.apply([{ kind: 'remove', key: row.key }])
    }
  }

  function rowKey (row: MockOverviewRow): string {
    return row.key ?? row.csv ?? ''
  }
</script>

<template>
  <div class="mock-overview-form">
    <div v-if="form.model.value === undefined" class="mock-overview-form__message text-medium-emphasis">讀取中</div>

    <div v-else-if="form.model.value === null" class="mock-overview-form__message text-medium-emphasis">
      找不到 mockCsv 物件，請以文字編輯
    </div>

    <table v-else class="mock-overview-form__table">
      <thead>
        <tr>
          <th class="mock-overview-form__center">登記</th>
          <th>表名</th>
          <th>代號</th>
          <th>CSV</th>
          <th class="mock-overview-form__number">列數</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="row in rows" :key="rowKey(row)" :class="{ 'mock-overview-form__row--off': !row.registered }">
          <td class="mock-overview-form__center">
            <v-switch
              v-if="row.key !== null"
              color="primary"
              density="compact"
              :disabled="row.csv === null"
              hide-details
              inset
              :model-value="row.registered"
              @update:model-value="value => setRegistered(row, Boolean(value))"
            />
          </td>

          <td>{{ row.key === null ? '' : row.label ?? row.key }}</td>
          <td class="mock-overview-form__key">{{ row.key ?? '' }}</td>

          <td>
            <v-chip
              v-if="row.csv"
              size="small"
              :text="fileName(row.csv)"
              variant="outlined"
              @click="files.open(row.csv)"
            />

            <v-btn
              v-else-if="row.key !== null && files.tables[row.key]"
              class="mock-overview-form__create"
              :prepend-icon="mdiPlus"
              size="small"
              text="建立 CSV"
              variant="outlined"
              @click="tables.createCsv(row.key)"
            />
          </td>

          <td class="mock-overview-form__number">{{ row.rows ?? '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.mock-overview-form {
  height: 100%;
  overflow: auto;
}

.mock-overview-form__message {
  padding: 16px;
}

.mock-overview-form__table {
  min-width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.mock-overview-form__table th {
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

/* 各格垂直置中 */
.mock-overview-form__table td {
  height: 40px;
  padding: 0 8px;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: nowrap;
  vertical-align: middle;
}

.mock-overview-form__table .mock-overview-form__center {
  text-align: center;
}

.mock-overview-form__center :deep(.v-selection-control) {
  justify-content: center;
}

/* 開關縮為一半，與表的總覽相同 */
.mock-overview-form__center :deep(.v-switch) {
  transform: scale(0.5);
}

.mock-overview-form__table .mock-overview-form__number {
  text-align: right;
}

.mock-overview-form__key {
  font-family: monospace;
}

.mock-overview-form__create {
  font-weight: 400;
  letter-spacing: normal;
}

/* 未登記的列為淡色 */
.mock-overview-form__row--off td:not(:first-child) {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
