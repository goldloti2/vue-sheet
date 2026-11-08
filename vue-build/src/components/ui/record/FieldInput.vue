<script lang="ts" setup>
  import type { TableKey } from '@/schema'
  import type { SchemaColumn, TableSchema } from '@/schema/types'
  import { computed, onBeforeUnmount, shallowRef } from 'vue'
  import FormattedValue from '@/components/ui/view/FormattedValue.vue'
  import { actionIcons } from '@/composables/actions/useTableActions'
  import { useTableList } from '@/composables/data/useTable'
  import { openForm } from '@/composables/shell/useFormLayers'
  import { schemas } from '@/schema'
  import { labelDisplayValue } from '@/schema/format'
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
    // 此處可以新增父列。ref 欄位另須設定 allowCreate
    creatable?: boolean
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

  // ref 欄位的選項為父表整張表（共用快取）：值為 id，文字為父列的 $label，依 refSort 再依父表的 defaultSort 排序
  const refList = props.column.type === 'ref'
    ? useTableList<{ id: string, $label: string }>(props.column.refTable as TableKey)
    : null

  // row 只在值對應到父列時存在。指向不存在的父列時，選取的值只有 id
  const refItems = computed((): { id: string, title: string, row?: object }[] => {
    if (props.column.type !== 'ref' || !refList) {
      return []
    }
    return sortRows(refList.data.value, schemas[props.column.refTable as TableKey], props.column.refSort)
      .map(row => ({ id: row.id, title: row.$label, row }))
  })

  // 選項與選取的值皆套用父列的條件式格式，於繪製時才計算
  function refDisplay (title: string, row: object | undefined) {
    return row && props.column.type === 'ref'
      ? labelDisplayValue(row, schemas[props.column.refTable as TableKey])
      : { text: title }
  }

  const refSearch = shallowRef<string>('')
  const refMenu = shallowRef(false)

  const canCreateParent = computed(() => props.creatable && props.column.type === 'ref' && props.column.allowCreate)

  let unmounted = false
  onBeforeUnmount(() => {
    unmounted = true
  })

  // 開啟父表的新增表單，送出後選取新的列。取消時不改動。這個欄位已不存在時不寫入
  async function createParent () {
    if (props.column.type !== 'ref') {
      return
    }

    refMenu.value = false
    const created = await openForm<{ id: string }>(props.column.refTable as TableKey)
    if (created && !unmounted) {
      refSearch.value = ''
      model.value = created.id
    }
  }

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
    v-model:menu="refMenu"
    v-model:search="refSearch"
    class="field-input__ref"
    :class="[requiredClass, { 'field-input__ref--searching': refSearch }]"
    clearable
    item-title="title"
    item-value="id"
    :items="refItems"
    :loading="refList?.loading.value ?? false"
    :model-value="textValue"
    @update:model-value="(value) => model = value"
  >
    <template v-if="canCreateParent" #prepend-item>
      <v-list-item :prepend-icon="actionIcons.new" title="新增…" @click="createParent" />
      <v-divider />
    </template>

    <template #item="{ item, props: itemProps }">
      <v-list-item v-bind="itemProps" role="option">
        <template #title>
          <FormattedValue :value="refDisplay(item.title, item.row)" />
        </template>
      </v-list-item>
    </template>

    <template #selection="{ item, internalItem }">
      <span class="v-autocomplete__selection-text">
        <FormattedValue :value="refDisplay(internalItem.title, item.row)" />
      </span>
    </template>
  </v-autocomplete>

  <!-- 長文：Enter 換行，高度隨內容增加 -->
  <v-textarea
    v-else-if="column.type === 'text' && column.multiline"
    v-bind="{ ...$attrs, ...common }"
    auto-grow
    :class="requiredClass"
    :model-value="textValue"
    rows="4"
    @update:model-value="setText"
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
/* 有 selection slot 時 Vuetify 不再以輸入框疊於選取的值之上，此處還原單選的排版。輸入文字搜尋時隱藏選取的值 */
.field-input__ref.v-text-field :deep(input) {
  position: absolute;
  left: 0;
  right: 0;
  flex: 1 1;
  width: 100%;
  padding-inline: inherit;
}

.field-input__ref :deep(.v-field--dirty:not(.v-field--focused) input),
.field-input__ref--searching :deep(.v-autocomplete__selection) {
  opacity: 0;
}

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
