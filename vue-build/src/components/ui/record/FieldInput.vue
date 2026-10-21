<script lang="ts" setup>
  import type { TableKey } from '@/schema'
  import type { SchemaColumn, TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import { useTableList } from '@/composables/data/useTable'
  import { schemas } from '@/schema'
  import { presentValues } from '@/schema/filter'
  import { sortRows } from '@/schema/sort'

  // 單一真實欄位的輸入元件，依 column.type 選擇；表單（DataForm）與詳細頁的快速編輯（InlineField）共用。
  // 其餘屬性與事件（readonly、hint、density、@blur…）原樣交給內層的 Vuetify 元件
  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    column: SchemaColumn
    schema: TableSchema
    // 省略時不顯示標籤（詳細頁的名稱另外顯示）
    label?: string
    // 標籤後加上錯誤色的「*」
    required?: boolean
    errorMessages?: string | readonly string[]
  }>()

  const model = defineModel<unknown>()

  // 各輸入元件要的值型別
  const numberValue = computed(() => model.value as number | null)
  const dateValue = computed(() => model.value as Date | null)
  const textValue = computed(() => model.value as string | null)

  // 文字類的空字串一律存成 null
  function setText (value: string | null) {
    model.value = value === '' ? null : value
  }

  // boolean 以 'true'／'false' 交給按鈕組；空的是 undefined，兩顆都不選
  const booleanKey = computed(() => typeof model.value === 'boolean' ? String(model.value) : undefined)

  // 按鈕組取消選取時回傳 undefined，即清空
  function setBoolean (key: unknown) {
    model.value = key === 'true' ? true : (key === 'false' ? false : null)
  }

  // 數字欄位的 min／max／step；沒設時交給 v-number-input 的預設
  function numberOption (option: 'min' | 'max' | 'step'): number | undefined {
    return props.column.type === 'number' ? props.column[option] : undefined
  }

  // ref 欄位的選項就是對方整張表（共用快取）：值是 id、文字是對方的 $label，照對方的 defaultSort 排
  const refList = props.column.type === 'ref'
    ? useTableList<{ id: string, $label: string }>(props.column.refTable as TableKey)
    : null

  const refItems = computed(() => {
    if (props.column.type !== 'ref' || !refList) {
      return []
    }
    return sortRows(refList.data.value, schemas[props.column.refTable as TableKey])
      .map(row => ({ id: row.id, title: row.$label }))
  })

  // suggestFromData 要讀自己這張表的列。只拿到 schema，從 schemas 反查代稱（schema 物件是單例）
  const ownTable = (Object.keys(schemas) as TableKey[]).find(key => schemas[key] === props.schema)
  const ownList = ownTable && props.column.type === 'select' && props.column.suggestFromData
    ? useTableList<object>(ownTable)
    : null

  // combobox 的建議：options 全部照原順序在前，開了 suggestFromData 再接資料裡多出來的值（跟篩選抽屜同一個排法）
  const suggestions = computed(() => {
    if (props.column.type !== 'select') {
      return []
    }
    return ownList
      ? [...props.column.options, ...presentValues(ownList.data.value, props.column).extra]
      : props.column.options
  })

  // 各輸入元件共用；class 另以 :class 加上，才會與呼叫端給的 class 合併
  const common = computed(() => ({
    label: props.label,
    errorMessages: props.errorMessages ?? [],
  }))

  const requiredClass = computed(() => ({ 'field-input--required': props.required }))
</script>

<template>
  <!-- −／＋ 都在右側、以 inset 呈現（預設是上下箭頭，以 slot 換掉圖示）；不限制小數位數，輸入的值不會被四捨五入 -->
  <v-number-input
    v-if="column.type === 'number'"
    v-bind="{ ...$attrs, ...common }"
    :class="requiredClass"
    inset
    :max="numberOption('max')"
    :min="numberOption('min')"
    :model-value="numberValue"
    :precision="null"
    :step="numberOption('step')"
    @update:model-value="(value) => model = value"
  >
    <template #decrement="{ props: controlProps }">
      <v-btn v-bind="controlProps" aria-hidden="true" icon="$minus" tabindex="-1" />
    </template>

    <template #increment="{ props: controlProps }">
      <v-btn v-bind="controlProps" aria-hidden="true" icon="$plus" tabindex="-1" />
    </template>
  </v-number-input>

  <!-- 日曆圖示放在欄位內右側 -->
  <v-date-input
    v-else-if="column.type === 'date'"
    v-bind="{ ...$attrs, ...common }"
    append-inner-icon="$calendar"
    :class="requiredClass"
    input-format="yyyy/mm/dd"
    :model-value="dateValue"
    prepend-icon=""
    @update:model-value="(value) => model = value"
  />

  <!-- 否／是兩顆互斥的按鈕；再按一次已選的那顆即清空。沒有標籤時只有按鈕組 -->
  <v-input
    v-else-if="column.type === 'boolean'"
    v-bind="$attrs"
    class="field-input__boolean"
    :class="{ 'field-input__boolean--labeled': label }"
    :error-messages="common.errorMessages"
  >
    <span
      v-if="label"
      class="field-input__boolean-label"
      :class="{ 'field-input__boolean-label--required': required }"
    >{{ label }}</span>

    <v-btn-toggle
      class="field-input__boolean-toggle"
      density="comfortable"
      divided
      :model-value="booleanKey"
      variant="outlined"
      @update:model-value="setBoolean"
    >
      <v-btn value="false">否</v-btn>
      <v-btn value="true">是</v-btn>
    </v-btn-toggle>
  </v-input>

  <!-- 時長使用一般文字框，不使用原生的 type="time" -->
  <v-text-field
    v-else-if="column.type === 'duration'"
    v-bind="{ ...$attrs, ...common }"
    :class="requiredClass"
    :model-value="textValue"
    placeholder="時:分:秒"
    @update:model-value="setText"
  />

  <!-- allowCustom：options 只是建議，打了清單外的字也直接當值 -->
  <v-combobox
    v-else-if="column.type === 'select' && column.allowCustom"
    v-bind="{ ...$attrs, ...common }"
    :class="requiredClass"
    :items="suggestions"
    :model-value="textValue"
    @update:model-value="setText"
  />

  <v-select
    v-else-if="column.type === 'select'"
    v-bind="{ ...$attrs, ...common }"
    :class="requiredClass"
    :items="column.options"
    :model-value="textValue"
    @update:model-value="setText"
  />

  <v-autocomplete
    v-else-if="column.type === 'ref'"
    v-bind="{ ...$attrs, ...common }"
    :class="requiredClass"
    clearable
    item-title="title"
    item-value="id"
    :items="refItems"
    :loading="refList?.loading.value ?? false"
    :model-value="textValue"
    @update:model-value="(value) => model = value"
  />

  <v-text-field
    v-else
    v-bind="{ ...$attrs, ...common }"
    :class="requiredClass"
    :model-value="textValue"
    @update:model-value="setText"
  />
</template>

<style scoped>
/* 必填的欄位：標籤後加上錯誤色的「*」 */
.field-input--required :deep(.v-label)::after,
.field-input__boolean-label--required::after {
  content: ' *';
  color: rgb(var(--v-theme-error));
}

/* 有標籤時：標籤與按鈕組兩欄為 38:62，與詳細頁的名稱與值相同；標籤再長也只在左欄內換行 */
.field-input__boolean--labeled :deep(.v-input__control) {
  display: grid;
  grid-template-columns: minmax(0, 38fr) minmax(0, 62fr);
  align-items: center;
}

.field-input__boolean-label {
  padding-inline-start: var(--v-field-padding-start, 16px);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* 按鈕組一律佔所在空間的 62% 並置中：有標籤時為標籤以外的那一欄，沒有標籤時為整欄 */
.field-input__boolean-toggle {
  width: 62%;
  margin-inline: auto;
}

.field-input__boolean--labeled .field-input__boolean-toggle {
  justify-self: center;
  margin-inline: 0;
}

.field-input__boolean-toggle :deep(.v-btn) {
  flex: 1 1 0;
}
</style>
