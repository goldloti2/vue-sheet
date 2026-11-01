<script lang="ts" setup>
  import type { TableKey } from '@/schema'
  import type { SchemaColumn, TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import { useTableList } from '@/composables/data/useTable'
  import { schemas } from '@/schema'
  import { sortRows } from '@/schema/sort'

  // 單一真實欄位的輸入元件，依 column.type 選擇，DataForm 與 InlineField 共用。其餘屬性原樣交給內層元件
  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    column: SchemaColumn
    schema: TableSchema
    // 正在編輯的那一列，getter 已掛上，供 suggestedValues 使用
    row?: object
    // 省略時不顯示標籤（詳細頁的名稱另外顯示）
    label?: string
    // 標籤後加上錯誤色的「*」
    required?: boolean
    errorMessages?: string | readonly string[]
  }>()

  const model = defineModel<unknown>()

  // 各輸入元件所需的值型別
  const numberValue = computed(() => model.value as number | null)
  const dateValue = computed(() => model.value as Date | null)
  const textValue = computed(() => model.value as string | null)

  // 文字類的空字串一律存為 null
  function setText (value: string | null) {
    model.value = value === '' ? null : value
  }

  // boolean 以 'true'、'false' 交給按鈕組。空值為 undefined，兩個按鈕都不選取
  const booleanKey = computed(() => typeof model.value === 'boolean' ? String(model.value) : undefined)

  // 按鈕組取消選取時回傳 undefined，即清空
  function setBoolean (key: unknown) {
    model.value = key === 'true' ? true : (key === 'false' ? false : null)
  }

  // 數字欄位的 min、max、step。未設定時使用 v-number-input 的預設
  function numberOption (option: 'min' | 'max' | 'step'): number | undefined {
    return props.column.type === 'number' ? props.column[option] : undefined
  }

  // ref 欄位的選項為父表整張表（共用快取）：值為 id，文字為父列的 $label，依父表的 defaultSort 排序
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

  // suggestedValues 的 rows 為所屬這張表的列，由 schema 從 schemas 反查代稱（schema 物件為單例）
  const ownTable = (Object.keys(schemas) as TableKey[]).find(key => schemas[key] === props.schema)
  const ownList = ownTable && props.column.suggestedValues ? useTableList<object>(ownTable) : null

  // combobox 的建議：options 依原順序在前，再接 suggestedValues 算出的值，去除重複與空值
  const suggestions = computed(() => {
    if (props.column.type !== 'select') {
      return []
    }
    const computedValues = props.column.suggestedValues?.(props.row ?? {}, ownList?.data.value ?? []) ?? []
    const values = [...props.column.options, ...computedValues]
      .filter((value): value is string => typeof value === 'string' && value !== '')
    return [...new Set(values)]
  })

  // 各輸入元件共用。class 另以 :class 加上，才會與呼叫端提供的 class 合併
  const common = computed(() => ({
    label: props.label,
    errorMessages: props.errorMessages ?? [],
  }))

  const requiredClass = computed(() => ({ 'field-input--required': props.required }))
</script>

<template>
  <!-- −／＋ 皆在右側，以 inset 呈現，以 slot 取代預設的上下箭頭。不限制小數位數 -->
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

  <!-- 日曆圖示置於欄位內的右側 -->
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

  <!-- 否、是兩個互斥的按鈕，再按一次已選取的按鈕即清空。沒有標籤時只有按鈕組 -->
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
      color="primary"
      density="comfortable"
      divided
      :model-value="booleanKey"
      variant="outlined"
      @update:model-value="setBoolean"
    >
      <v-btn value="false" :variant="booleanKey === 'false' ? 'tonal' : 'outlined'">否</v-btn>
      <v-btn value="true" :variant="booleanKey === 'true' ? 'tonal' : 'outlined'">是</v-btn>
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

  <!-- allowCustom：options 只是建議，輸入清單外的文字也直接作為值 -->
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

/* 有標籤時：標籤與按鈕組兩欄的比例與詳細頁相同，標籤再長也只在左欄內換行（見 docs/design/detail.md 的「尺寸與樣式」） */
.field-input__boolean--labeled :deep(.v-input__control) {
  display: grid;
  grid-template-columns: minmax(0, 38fr) minmax(0, 62fr);
  align-items: center;
}

.field-input__boolean-label {
  padding-inline-start: var(--v-field-padding-start, 16px);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* 按鈕組佔所在空間的固定比例並置中。所在空間在有標籤時為右欄，沒有標籤時為整欄 */
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
