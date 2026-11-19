<script lang="ts" setup>
  import type { SchemaPath, SchemaValue } from '../../../shared/schema'
  import type { ColumnList, ColumnRow } from '../../../shared/schemaForm'
  import type { HeaderChange } from '@/composables/useSchemaForm'
  import { mdiDeleteOutline, mdiDragVertical, mdiMenuDown, mdiPlus, mdiRadioboxBlank, mdiRadioboxMarked } from '@mdi/js'
  import { computed, inject, shallowRef } from 'vue'
  import { useDragSort } from '@/composables/useDragSort'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { useFilesStore } from '@/stores/files'
  import { literalText, propertyValue, stringValue } from '../../../shared/schema'
  import { columnOptions, columnRows, idCandidates, sourceOf } from '../../../shared/schemaForm'
  import { tableKeyOf } from '../../../shared/tableKeys'
  import AddColumnDialog from './AddColumnDialog.vue'
  import CodeField from './CodeField.vue'
  import ColumnTypeDialog from './ColumnTypeDialog.vue'
  import CommitTextField from './CommitTextField.vue'
  import LabelChangeDialog from './LabelChangeDialog.vue'
  import RemoveColumnDialog from './RemoveColumnDialog.vue'

  const form = inject(SCHEMA_FORM_KEY)!
  const files = useFilesStore()

  const rows = computed(() => columnRows(form.model.value))
  const options = computed(() => columnOptions(rows.value))
  const candidates = computed(() => new Set(idCandidates(rows.value, form.types.value?.columnTypes ?? [])))
  const idColumn = computed(() => stringValue(propertyValue(form.model.value?.schema, 'idColumn')))
  const labelColumn = computed(() => stringValue(propertyValue(form.model.value?.schema, 'labelColumn')))

  // 程式碼的欄。only 為只屬於真實或虛擬欄位的設定，null 為兩者皆有
  const CODE_COLUMNS: { name: string, title: string, only: ColumnList | null }[] = [
    { name: 'default', title: '初始值', only: 'columns' },
    { name: 'validate', title: '驗證', only: 'columns' },
    { name: 'showIf', title: '顯示條件', only: null },
    { name: 'value', title: '計算方式', only: 'virtualColumns' },
  ]

  function isTrue (value: SchemaValue | undefined): boolean {
    return value?.kind === 'boolean' && value.value
  }

  function setText (row: ColumnRow, name: string, value: string, removeWhenEmpty: boolean): void {
    const valueText = value === '' && removeWhenEmpty ? null : literalText(value)
    void form.applyOrNotify([{ kind: 'setProperty', objectPath: row.path, name, valueText, after: 'label' }], 'now')
  }

  function labelOf (row: ColumnRow): string {
    return stringValue(propertyValue(row.object, 'label')) ?? ''
  }

  // 程式碼的對話框的標題，例如 初始值：價格。沒有標籤時為 key
  function codeTitle (title: string, row: ColumnRow): string {
    return `${title}：${labelOf(row) || row.key || ''}`
  }

  // 修改 key 與所有引用
  function commitKey (row: ColumnRow) {
    return (value: string) => row.key === null || value.trim() === row.key ? Promise.resolve(false) : form.renameKey(row.key, value.trim())
  }

  // 沒有 Sheet 表頭的真實欄位，標籤即為表頭，先以對話框選擇修改的方式
  interface LabelChange {
    row: ColumnRow
    oldLabel: string
    label: string
    csvPath: string | null
    done: (changed: boolean) => void
  }
  const labelChange = shallowRef<LabelChange | null>(null)

  function commitLabel (row: ColumnRow) {
    return async (value: string): Promise<boolean> => {
      const label = value.trim()
      if (label === '') {
        files.message = '標籤不可空白。'
        return false
      }
      if (row.list === 'virtualColumns' || propertyValue(row.object, 'sheetHeader')) {
        setText(row, 'label', label, false)
        return true
      }
      const tableKey = tableKeyOf(form.path())
      const csvPath = tableKey === null ? null : files.mockCsv[tableKey] ?? null
      return new Promise(resolve => {
        labelChange.value = { row, oldLabel: labelOf(row), label, csvPath, done: resolve }
      })
    }
  }

  async function chooseLabelChange (change: HeaderChange): Promise<void> {
    const pending = labelChange.value!
    const changed = await form.changeLabel(pending.row.path, pending.oldLabel, pending.label, change)
    labelChange.value = null
    pending.done(changed)
  }

  function cancelLabelChange (): void {
    labelChange.value?.done(false)
    labelChange.value = null
  }

  const adding = shallowRef(false)

  // 刪除欄位的確認
  const removingKey = shallowRef<string | null>(null)
  const removingRow = computed(() => rows.value.find(row => row.key !== null && row.key === removingKey.value) ?? null)
  const removeOpen = computed({
    get: () => removingRow.value !== null,
    set: open => {
      if (!open) {
        removingKey.value = null
      }
    },
  })

  function setRequired (row: ColumnRow, required: boolean): void {
    void form.applyOrNotify([{ kind: 'setProperty', objectPath: row.path, name: 'required', valueText: required ? 'true' : null }], 'soon')
  }

  function setSchemaKey (name: 'idColumn' | 'labelColumn', key: string | null): void {
    void form.applyOrNotify([{ kind: 'setProperty', objectPath: [], name, valueText: key === null ? null : literalText(key), after: 'idColumn' }], 'soon')
  }

  function commitCode (path: SchemaPath, name: string) {
    return (code: string | null) => form.apply([{ kind: 'setProperty', objectPath: path, name, valueText: code, code: true }], 'now')
  }

  // 型別的小視窗
  const typePath = shallowRef<string | null>(null)
  const typeRow = computed(() => rows.value.find(row => row.path.join('.') === typePath.value) ?? null)
  const typeOpen = computed({
    get: () => typeRow.value !== null,
    set: open => {
      if (!open) {
        typePath.value = null
      }
    },
  })

  // 拖曳只在同一個清單中移動。from 與 to 為 rows 中的位置
  const sort = useDragSort({
    items: () => rows.value,
    source: () => form.model.value,
    commit: (from, to) => {
      const source = rows.value[from]!
      const target = rows.value[to]!
      return form.applyOrNotify([{ kind: 'move', arrayPath: [source.list], from: source.index, to: target.index }], 'soon')
    },
  })
  const draggingRow = computed(() => sort.dragging.value === null ? null : rows.value[sort.dragging.value] ?? null)

  // 拖曳的影像為整列，而不只是把手
  function startDrag (event: DragEvent, index: number): void {
    sort.start(event, index, (event.target as HTMLElement).closest('tr'))
  }

  // 列以欄位的 key 識別，排序時同一列保留同一個元素
  function rowKey (row: ColumnRow): string {
    return row.key === null ? `#${row.path.join('.')}` : row.key
  }
</script>

<template>
  <div class="column-grid">
    <table class="column-grid__table">
      <thead>
        <tr>
          <th />
          <th class="column-grid__text column-grid__text--wide">key</th>
          <th class="column-grid__text column-grid__text--wide">標籤</th>
          <th class="column-grid__text column-grid__text--wide">Sheet 表頭</th>
          <th class="column-grid__text">型別</th>
          <th class="column-grid__center">主鍵</th>
          <th class="column-grid__center">稱呼</th>
          <th class="column-grid__center">必填</th>
          <th v-for="column in CODE_COLUMNS" :key="column.name" class="column-grid__code">{{ column.title }}</th>
          <th />
        </tr>
      </thead>

      <TransitionGroup name="column-grid" tag="tbody" @drop="sort.drop">
        <tr
          v-for="({ item: row, index }, position) in sort.entries.value"
          :key="rowKey(row)"
          :class="{ 'column-grid__row--virtual': row.list === 'virtualColumns', 'column-grid__row--dragging': sort.dragging.value === index }"
          @dragover="draggingRow?.list === row.list && sort.over($event, position)"
        >
          <td>
            <v-icon
              class="column-grid__handle"
              draggable="true"
              :icon="mdiDragVertical"
              size="18"
              @dragend="sort.end"
              @dragstart="startDrag($event, index)"
            />
          </td>

          <template v-if="row.object">
            <td class="column-grid__text column-grid__text--wide column-grid__key">
              <CommitTextField :commit="commitKey(row)" :disabled="row.key === null" :model-value="row.key ?? ''" />
            </td>

            <td class="column-grid__text column-grid__text--wide">
              <CommitTextField :commit="commitLabel(row)" :model-value="labelOf(row)" />
            </td>

            <td class="column-grid__text column-grid__text--wide">
              <CommitTextField
                :disabled="row.list === 'virtualColumns'"
                :model-value="stringValue(propertyValue(row.object, 'sheetHeader')) ?? ''"
                @commit="value => setText(row, 'sheetHeader', value, true)"
              />
            </td>

            <td class="column-grid__text">
              <v-text-field
                :append-inner-icon="mdiMenuDown"
                class="column-grid__type"
                density="compact"
                hide-details
                :model-value="stringValue(propertyValue(row.object, 'type')) ?? ''"
                readonly
                variant="outlined"
                @click="typePath = row.path.join('.')"
              />
            </td>

            <td class="column-grid__center">
              <v-btn
                :disabled="row.key === null || !candidates.has(row.key)"
                :icon="row.key !== null && idColumn === row.key ? mdiRadioboxMarked : mdiRadioboxBlank"
                size="small"
                variant="text"
                @click="setSchemaKey('idColumn', row.key)"
              />
            </td>

            <td class="column-grid__center">
              <v-btn
                :disabled="row.key === null"
                :icon="row.key !== null && labelColumn === row.key ? mdiRadioboxMarked : mdiRadioboxBlank"
                size="small"
                variant="text"
                @click="setSchemaKey('labelColumn', labelColumn === row.key ? null : row.key)"
              />
            </td>

            <td class="column-grid__center">
              <v-checkbox-btn
                density="compact"
                :disabled="row.list === 'virtualColumns'"
                :model-value="isTrue(propertyValue(row.object, 'required'))"
                @update:model-value="checked => setRequired(row, Boolean(checked))"
              />
            </td>

            <td v-for="column in CODE_COLUMNS" :key="column.name" class="column-grid__code">
              <CodeField
                :code="sourceOf(form.text(), propertyValue(row.object, column.name))"
                :commit="commitCode(row.path, column.name)"
                :disabled="column.only !== null && row.list !== column.only"
                :doc="form.types.value?.columnDocs[column.name]"
                :name="column.name"
                :object-path="row.path"
                :title="codeTitle(column.title, row)"
              />
            </td>

            <td>
              <v-tooltip :disabled="row.key === null || idColumn !== row.key" location="start" text="主鍵的欄位無法刪除">
                <template #activator="{ props: tooltip }">
                  <span v-bind="tooltip">
                    <v-btn
                      aria-label="刪除欄位"
                      :disabled="row.key === null || idColumn === row.key"
                      :icon="mdiDeleteOutline"
                      size="small"
                      variant="text"
                      @click="removingKey = row.key"
                    />
                  </span>
                </template>
              </v-tooltip>
            </td>
          </template>

          <td v-else class="column-grid__other text-medium-emphasis" :colspan="8 + CODE_COLUMNS.length">
            以程式碼寫成，請以文字編輯：{{ row.code }}
          </td>
        </tr>
      </TransitionGroup>
    </table>

    <v-btn
      class="column-grid__add ma-2"
      :prepend-icon="mdiPlus"
      text="新增欄位"
      variant="outlined"
      @click="adding = true"
    />

    <ColumnTypeDialog v-if="typeRow" v-model="typeOpen" :columns="options" :row="typeRow" />
    <AddColumnDialog v-model="adding" />
    <RemoveColumnDialog v-if="removingRow" v-model="removeOpen" :column-key="removingRow.key!" :label="labelOf(removingRow) || null" />

    <LabelChangeDialog
      v-if="labelChange"
      :csv-path="labelChange.csvPath"
      :is-id="labelChange.row.key !== null && labelChange.row.key === idColumn"
      :label="labelChange.label"
      :old-label="labelChange.oldLabel"
      @cancel="cancelLabelChange"
      @choose="chooseLabelChange"
    />
  </div>
</template>

<style scoped>
/* 填滿面板並自行捲動：表頭固定於上端，橫向捲軸位於下端 */
.column-grid {
  height: 100%;
  overflow: auto;
}

.column-grid__table {
  min-width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.column-grid__table th {
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
.column-grid__table td {
  height: 40px;
  padding: 0 8px;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: nowrap;
  vertical-align: middle;
}

/* 虛擬欄位的 key 為主色 */
.column-grid__row--virtual .column-grid__key :deep(input) {
  color: rgb(var(--v-theme-primary));
}

.column-grid__row--dragging {
  opacity: 0.4;
}

.column-grid-move {
  transition: transform 150ms ease;
}

.column-grid__handle {
  cursor: grab;
}

.column-grid__table .column-grid__text {
  width: 140px;
  min-width: 140px;
  max-width: 140px;
}

/* key、標籤與 Sheet 表頭較寬 */
.column-grid__table .column-grid__text--wide {
  width: 180px;
  min-width: 180px;
  max-width: 180px;
}

.column-grid__key :deep(input) {
  font-family: monospace;
}

/* 橫向捲動時仍位於左緣。高度與字體同欄位的輸入框 */
.column-grid__add.v-btn {
  position: sticky;
  left: 0;
  height: 32px;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.009375em;
}

.column-grid__type :deep(input) {
  cursor: pointer;
}

.column-grid__table .column-grid__center {
  text-align: center;
}

.column-grid__center :deep(.v-selection-control) {
  justify-content: center;
}

.column-grid__table .column-grid__code {
  width: 220px;
  min-width: 220px;
  max-width: 220px;
}

.column-grid__other {
  white-space: normal;
}
</style>
