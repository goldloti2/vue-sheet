<script lang="ts" setup>
  import type { SchemaEdit } from '../../../shared/schema'
  import { mdiDelete } from '@mdi/js'
  import { computed, inject } from 'vue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { useFilesStore } from '@/stores/files'
  import { literalText, propertyValue, stringValue } from '../../../shared/schema'
  import { columnRows, ruleItems, sourceOf } from '../../../shared/schemaForm'
  import CodeField from './CodeField.vue'

  const props = defineProps<{
    /** 規則於 rules 中的位置 */
    index: number
  }>()

  const open = defineModel<boolean>({ required: true })

  const form = inject(SCHEMA_FORM_KEY)!
  const files = useFilesStore()

  const rule = computed(() => ruleItems(form.model.value)?.[props.index] ?? null)
  const path = computed(() => ['rules', props.index])
  const table = computed(() => propertyValue(rule.value, 'table'))
  const values = computed(() => propertyValue(rule.value, 'values'))
  // 值由規則填入的欄位：columns 中的欄位
  const columns = computed(() => columnRows(form.model.value).filter(row => row.list === 'columns' && row.key !== null))
  const docs = computed(() => form.types.value?.ruleDocs ?? {})

  // 來源表只能是真實表，依 schemas 的順序
  const tables = computed(() => [...files.tableOrder, ...Object.keys(files.tables).filter(key => !files.tableOrder.includes(key)).toSorted()]
    .filter(key => files.tables[key] && !files.tables[key].virtual)
    .map(key => ({ title: files.tables[key]?.label ? `${files.tables[key].label}（${key}）` : key, value: key })))

  // 開啟時的內容，取消時改回
  const original = form.text()

  // 小視窗中的修改立即寫入記憶體中的內容，關閉時才更新預覽
  function apply (edits: SchemaEdit[]): Promise<string | null> {
    return form.apply(edits, 'none')
  }

  function selectTable (key: string): void {
    void form.applyOrNotify([{ kind: 'setProperty', objectPath: path.value, name: 'table', valueText: literalText(key) }], 'none')
  }

  function commitWhen (code: string | null): Promise<string | null> {
    return apply([{ kind: 'setProperty', objectPath: path.value, name: 'when', valueText: code, code: true, after: 'table' }])
  }

  function commitValue (key: string) {
    return (code: string | null) => apply([{ kind: 'setProperty', objectPath: [...path.value, 'values'], name: key, valueText: code, code: true }])
  }

  function labelOf (key: string): string {
    const row = columns.value.find(candidate => candidate.key === key)
    return stringValue(propertyValue(row?.object ?? null, 'label')) ?? key
  }

  async function removeRule (): Promise<void> {
    await form.applyOrNotify([{ kind: 'remove', arrayPath: ['rules'], index: props.index }], 'none')
    close(false)
  }

  async function cancel (): Promise<void> {
    await form.restore(original)
    close(false)
  }

  function close (next: boolean): void {
    open.value = next
    if (!next) {
      form.syncPreview()
    }
  }
</script>

<template>
  <v-dialog max-width="560" :model-value="open" @update:model-value="close">
    <v-card class="editor-compact-inputs" :title="`規則 ${index + 1}`">
      <v-card-text>
        <p v-if="!rule" class="text-body-2 text-medium-emphasis">找不到這條規則</p>
        <p v-else-if="rule.kind !== 'object'" class="text-body-2 text-medium-emphasis">以程式碼寫成，請以文字編輯</p>

        <template v-else>
          <div class="rule-dialog__option">
            <span class="text-body-2" :title="docs.table">來源表<span class="text-error">*</span></span>

            <v-select
              v-if="!table || table.kind === 'string'"
              density="compact"
              hide-details
              :items="tables"
              :model-value="stringValue(table)"
              variant="outlined"
              @update:model-value="selectTable"
            />

            <span v-else class="text-medium-emphasis">以程式碼寫成：{{ sourceOf(form.text(), table) }}</span>
          </div>

          <div class="rule-dialog__option">
            <span class="text-body-2" :title="docs.when">條件</span>

            <CodeField
              :code="sourceOf(form.text(), propertyValue(rule, 'when'))"
              :commit="commitWhen"
              :doc="docs.when"
              name="when"
              :object-path="path"
              :title="`規則 ${index + 1}/條件`"
            />
          </div>

          <p class="text-body-2 mt-3 mb-1">各欄位的值</p>
          <p class="text-caption text-medium-emphasis mb-2">{{ docs.values ?? '' }}</p>

          <p v-if="values && values.kind !== 'object'" class="text-body-2 text-medium-emphasis">以程式碼寫成：{{ sourceOf(form.text(), values) }}</p>

          <template v-else>
            <div v-for="column in columns" :key="column.key!" class="rule-dialog__option">
              <span class="text-body-2">{{ labelOf(column.key!) }}</span>

              <CodeField
                :code="sourceOf(form.text(), propertyValue(values, column.key!))"
                :commit="commitValue(column.key!)"
                :doc="docs.values"
                :name="column.key!"
                :object-path="[...path, 'values']"
                :title="`規則 ${index + 1}/${labelOf(column.key!)}`"
              />
            </div>

            <p v-if="columns.length === 0" class="text-body-2 text-medium-emphasis">還沒有欄位，請先在欄位分頁新增</p>
          </template>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-btn
          v-if="rule"
          color="error"
          :prepend-icon="mdiDelete"
          text="刪除規則"
          variant="text"
          @click="removeRule"
        />

        <v-spacer />
        <v-btn text="取消" @click="cancel" />
        <v-btn color="primary" text="完成" @click="close(false)" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.rule-dialog__option {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-height: 40px;
}
</style>
