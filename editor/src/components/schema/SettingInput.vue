<script lang="ts" setup>
  import type { SchemaPath, SchemaValue, SettingOption } from '../../../shared/schema'
  import type { PreviewTiming } from '@/composables/useSchemaForm'
  import { computed, inject } from 'vue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { literalText, stringValue } from '../../../shared/schema'
  import { type ColumnOption, sourceOf } from '../../../shared/schemaForm'
  import CodeField from './CodeField.vue'
  import ColorSwatches from './ColorSwatches.vue'
  import CommitTextField from './CommitTextField.vue'
  import ItemList from './ItemList.vue'

  const props = defineProps<{
    option: SettingOption
    /** 目前的值。沒有此設定時為 undefined */
    value: SchemaValue | undefined
    /** 此設定所在的物件 */
    objectPath: SchemaPath
    /** 欄位的選單的選項 */
    columns: readonly ColumnOption[]
    disabled?: boolean
    /** 程式碼寫回後更新預覽的時機。其他設定由 change 的接收端決定 */
    codeTiming?: PreviewTiming
    /** 程式碼的對話框的標題。省略時為設定名 */
    title?: string
    /** 文字的設定改以選單選擇這些值，例如 refTable 的表 */
    suggestions?: readonly { title: string, value: string }[]
  }>()

  const emit = defineEmits<{
    /** valueText 為 null 時刪除此設定 */
    change: [valueText: string | null, timing: PreviewTiming]
  }>()

  const form = inject(SCHEMA_FORM_KEY)!
  const NONE = '（不設定）'

  // 值的寫法與輸入方式不符時，改以程式碼輸入
  const control = computed(() => {
    const { kind } = props.option.control
    const value = props.value
    if (!value || kind === 'code') {
      return kind
    }
    const literal = {
      boolean: value.kind === 'boolean',
      number: value.kind === 'number',
      string: value.kind === 'string',
      choice: value.kind === 'string',
      column: value.kind === 'string',
      strings: value.kind === 'array' && value.items.every(item => item.kind === 'string'),
      columns: value.kind === 'array' && value.items.every(item => item.kind === 'string'),
    }[kind]
    return literal ? kind : 'code'
  })

  const choices = computed(() => {
    if (props.option.control.kind === 'choice') {
      return props.option.control.values.map(value => ({ title: value, value }))
    }
    if (props.option.control.kind === 'string') {
      return props.suggestions ?? []
    }
    return props.columns
  })
  // ColorName 型別的設定以色球選擇
  const isColor = computed(() => control.value === 'choice' && props.option.typeText === 'ColorName')
  const listed = computed(() => control.value === 'choice' || control.value === 'column' || (control.value === 'string' && props.suggestions !== undefined))
  const stringItems = computed(() => props.value?.kind === 'array' ? props.value.items.map(item => stringValue(item) ?? '') : [])

  const columnLabels = computed(() => Object.fromEntries(props.columns.map(column => [column.value, column.title])))

  // 勾選後依欄位的順序排列
  function checkColumn (key: string, checked: boolean): void {
    const next = new Set(stringItems.value)
    if (checked) {
      next.add(key)
    } else {
      next.delete(key)
    }
    commitList(props.columns.map(column => column.value).filter(value => next.has(value)))
  }

  // 選填的設定清空時刪除
  function emptyText (): string | null {
    return props.option.optional ? null : literalText('')
  }

  function commitText (text: string): void {
    if (props.option.control.kind === 'number') {
      emit('change', text.trim() === '' ? null : String(Number(text)), 'now')
    } else {
      emit('change', text === '' ? emptyText() : literalText(text), 'now')
    }
  }

  function commitChoice (choice: string | null): void {
    emit('change', choice === null || choice === NONE ? null : literalText(choice), 'soon')
  }

  function commitList (items: string[]): void {
    emit('change', items.length === 0 && props.option.optional ? null : literalText(items), 'soon')
  }

  async function commitCode (code: string | null): Promise<string | null> {
    return form.apply([{ kind: 'setProperty', objectPath: props.objectPath, name: props.option.name, valueText: code, code: true }], props.codeTiming ?? 'now')
  }
</script>

<template>
  <v-checkbox-btn
    v-if="control === 'boolean'"
    density="compact"
    :disabled="disabled"
    :model-value="value?.kind === 'boolean' && value.value"
    @update:model-value="checked => emit('change', checked ? 'true' : null, 'soon')"
  />

  <ColorSwatches
    v-else-if="isColor"
    :disabled="disabled"
    :names="choices.map(choice => choice.value)"
    :selected="stringValue(value)"
    @select="name => commitChoice(name)"
  />

  <v-select
    v-else-if="listed"
    autocomplete="off"
    density="compact"
    :disabled="disabled"
    hide-details
    :items="option.optional ? [{ title: NONE, value: NONE }, ...choices] : choices"
    :model-value="stringValue(value) ?? (option.optional ? NONE : null)"
    variant="outlined"
    @update:model-value="commitChoice"
  />

  <CommitTextField
    v-else-if="control === 'number' || control === 'string'"
    :disabled="disabled"
    :model-value="value?.kind === 'number' ? String(value.value) : stringValue(value) ?? ''"
    :type="control === 'number' ? 'number' : 'text'"
    @commit="commitText"
  />

  <v-combobox
    v-else-if="control === 'strings'"
    autocomplete="off"
    chips
    closable-chips
    density="compact"
    :disabled="disabled"
    hide-details
    :model-value="stringItems"
    multiple
    variant="outlined"
    @update:model-value="commitList"
  />

  <ItemList
    v-else-if="control === 'columns'"
    :checked="stringItems"
    class="setting-input__columns"
    :items="columns.map(column => column.value)"
    :labels="columnLabels"
    @check="checkColumn"
  />

  <CodeField
    v-else
    :code="sourceOf(form.text(), value)"
    :commit="commitCode"
    :disabled="disabled"
    :doc="option.doc"
    :name="option.name"
    :object-path="objectPath"
    :title="title ?? option.name"
  />
</template>

<style scoped>
.setting-input__columns {
  flex: 1;
  max-width: 360px;
  padding: 4px 0;
}
</style>
