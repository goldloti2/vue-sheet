<script lang="ts" setup>
  import type { ConfigEdit, ConfigRow, ConfigTable, ConfigValue } from '../../../shared/configGs'
  import { mdiAlertOutline, mdiDeleteOutline } from '@mdi/js'
  import { computed } from 'vue'
  import { useFilesStore } from '@/stores/files'
  import { configRows, idColumnMismatch } from '../../../shared/configGs'
  import CommitTextField from '../schema/CommitTextField.vue'

  const props = defineProps<{
    /** 找不到 TABLES 物件時為 null */
    tables: ConfigTable[] | null
  }>()

  const emit = defineEmits<{
    edit: [edits: ConfigEdit[]]
  }>()

  const files = useFilesStore()

  const rows = computed(() => props.tables
    ? configRows(props.tables, { tables: files.tables, tableOrder: files.tableOrder })
    : [])

  type FieldName = 'sheetName' | 'idColumn'

  const FIELDS: [FieldName, string][] = [
    ['sheetName', 'Sheet 分頁名稱'],
    ['idColumn', 'ID 欄'],
  ]

  function rowKey (row: ConfigRow, index: number): string {
    return row.key ?? `#${index}`
  }

  // 以字面值寫成或沒有此設定時可以修改
  function editable (value: ConfigValue<string>): boolean {
    return value === null || value.kind === 'value'
  }

  function textOf (value: ConfigValue<string>): string {
    return value?.kind === 'value' ? value.value : ''
  }

  function codeOf (value: ConfigValue<string>): string {
    return value?.kind === 'code' ? value.text : ''
  }

  // 空白時改回原值
  function commitField (key: string, name: FieldName) {
    return async (value: string): Promise<boolean> => {
      const trimmed = value.trim()
      if (trimmed === '') {
        return false
      }
      emit('edit', [{ kind: 'setTable', key, name, value: trimmed }])
      return true
    }
  }

  // 分頁名稱為表名，ID 欄為主鍵欄的表頭
  function register (row: ConfigRow): void {
    if (row.key !== null && row.idHeader !== null) {
      emit('edit', [{ kind: 'addTable', key: row.key, sheetName: row.label ?? row.key, idColumn: row.idHeader }])
    }
  }

  function remove (key: string): void {
    emit('edit', [{ kind: 'removeTable', key }])
  }
</script>

<template>
  <div v-if="tables === null" class="config-tables__message text-medium-emphasis">
    找不到 TABLES 物件，請以其他編輯器修改
  </div>

  <table v-else class="config-tables">
    <thead>
      <tr>
        <th>表名</th>
        <th>代號</th>
        <th v-for="[name, title] in FIELDS" :key="name">{{ title }}</th>
        <th>狀態</th>
        <th />
      </tr>
    </thead>

    <tbody>
      <tr
        v-for="(row, index) in rows"
        :key="rowKey(row, index)"
        :class="{ 'config-tables__row--faded': row.table === null }"
      >
        <td>{{ row.label ?? '—' }}</td>
        <td class="config-tables__key">{{ row.key ?? '—' }}</td>

        <template v-if="row.table === null">
          <td>{{ row.label ?? row.key }}</td>
          <td>{{ row.idHeader ?? '—' }}</td>
          <td>未登記</td>

          <td>
            <v-tooltip :disabled="row.idHeader !== null" location="start" text="schema 中找不到主鍵欄的表頭">
              <template #activator="{ props: tooltip }">
                <span v-bind="tooltip">
                  <v-btn
                    :disabled="row.idHeader === null"
                    size="small"
                    text="登記"
                    variant="outlined"
                    @click="register(row)"
                  />
                </span>
              </template>
            </v-tooltip>
          </td>
        </template>

        <template v-else-if="row.key === null">
          <td class="text-medium-emphasis" colspan="4">以程式碼寫成，請以其他編輯器修改</td>
        </template>

        <template v-else>
          <td v-for="[name] in FIELDS" :key="name" class="config-tables__field">
            <CommitTextField
              v-if="editable(row.table[name])"
              :commit="commitField(row.key, name)"
              :model-value="textOf(row.table[name])"
            />

            <span v-else class="text-medium-emphasis">以程式碼寫成：{{ codeOf(row.table[name]) }}</span>
          </td>

          <td>
            <span v-if="row.orphan" class="config-tables__warning">
              <v-icon :icon="mdiAlertOutline" size="16" />
              找不到表
            </span>

            <span v-else-if="idColumnMismatch(row)" class="config-tables__warning">
              <v-icon :icon="mdiAlertOutline" size="16" />
              與主鍵欄的表頭「{{ row.idHeader }}」不同
            </span>
          </td>

          <td>
            <v-btn
              v-if="row.orphan"
              aria-label="刪除登記"
              :icon="mdiDeleteOutline"
              size="small"
              variant="text"
              @click="remove(row.key)"
            />
          </td>
        </template>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.config-tables__message {
  padding: 16px;
}

.config-tables {
  min-width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.config-tables th {
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
.config-tables td {
  height: 40px;
  padding: 0 8px;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: nowrap;
  vertical-align: middle;
}

.config-tables__field {
  width: 180px;
}

.config-tables__key {
  font-family: monospace;
}

.config-tables__warning {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: rgb(var(--v-theme-warning));
}

/* 未登記的表為淡色 */
.config-tables__row--faded td {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
