<script lang="ts" setup>
  import type { ColumnOption, ColumnRow } from '../../../shared/schemaForm'
  import type { PreviewTiming } from '@/composables/useSchemaForm'
  import { computed, inject } from 'vue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { useFilesStore } from '@/stores/files'
  import { propertyValue, stringValue } from '../../../shared/schema'
  import SettingInput from './SettingInput.vue'

  const props = defineProps<{
    row: ColumnRow
    columns: readonly ColumnOption[]
  }>()

  const open = defineModel<boolean>({ required: true })

  const form = inject(SCHEMA_FORM_KEY)!
  const files = useFilesStore()

  // 虛擬表的欄位與虛擬欄位，ref 只有 refTable
  const REF_WRITE_OPTIONS = new Set(['onDelete', 'onEmpty', 'refSort', 'allowCreate'])
  const readOnly = computed(() => (form.model.value?.virtual ?? false) || props.row.list === 'virtualColumns')

  // refTable 以選單列出現有的表。真實表的真實欄位不可指向虛擬表
  const tables = computed(() => Object.entries(files.tables)
    .filter(([, table]) => readOnly.value || !table.virtual)
    .map(([key, table]) => ({ title: table.label ? `${table.label}（${key}）` : key, value: key }))
    .toSorted((a, b) => a.value.localeCompare(b.value)))

  const columnTypes = computed(() => form.types.value?.columnTypes ?? [])
  const type = computed(() => stringValue(propertyValue(props.row.object, 'type')))
  const info = computed(() => columnTypes.value.find(candidate => candidate.name === type.value) ?? null)
  const options = computed(() => (info.value?.options ?? []).filter(option => !readOnly.value || !REF_WRITE_OPTIONS.has(option.name)))

  // 開啟時的內容，取消時改回
  const original = form.text()

  // 小視窗中的修改立即寫入記憶體中的內容，關閉時才更新預覽
  function selectType (next: string): void {
    if (props.row.key !== null && next !== type.value) {
      void form.applyOrNotify([{ kind: 'setColumnType', key: props.row.key, type: next }], 'none')
    }
  }

  function setOption (name: string, valueText: string | null, _timing: PreviewTiming): void {
    void form.applyOrNotify([{ kind: 'setProperty', objectPath: props.row.path, name, valueText, after: 'type' }], 'none')
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
    <v-card class="editor-compact-inputs" :title="`${row.key ?? ''} 型別`">
      <v-card-text>
        <v-select
          density="compact"
          :disabled="row.key === null"
          hide-details
          :item-title="item => item.name"
          :item-value="item => item.name"
          :items="columnTypes"
          label="型別"
          :model-value="type"
          variant="outlined"
          @update:model-value="selectType"
        />

        <p v-if="info?.doc" class="text-caption text-medium-emphasis mt-1 mb-3">{{ info.doc }}</p>

        <div v-for="option in options" :key="option.name" class="column-type-dialog__option">
          <span class="text-body-2">
            {{ option.name }}<span v-if="!option.optional" class="text-error">*</span>
          </span>

          <div class="column-type-dialog__input">
            <SettingInput
              code-timing="none"
              :columns="columns"
              :object-path="row.path"
              :option="option"
              :suggestions="option.name === 'refTable' ? tables : undefined"
              :value="propertyValue(row.object, option.name)"
              @change="(valueText, timing) => setOption(option.name, valueText, timing)"
            />
          </div>
        </div>

        <p v-if="info && options.length === 0" class="text-body-2 text-medium-emphasis">此型別沒有其他設定</p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="取消" @click="cancel" />
        <v-btn color="primary" text="完成" @click="close(false)" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.column-type-dialog__option {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-height: 40px;
}

/* 勾選框與選項名稱置於同一高度，並與其他輸入框的左緣對齊 */
.column-type-dialog__input {
  display: flex;
  align-items: center;
}

.column-type-dialog__input > :deep(.v-selection-control) {
  flex: none;
  margin-left: -8px;
}
</style>
