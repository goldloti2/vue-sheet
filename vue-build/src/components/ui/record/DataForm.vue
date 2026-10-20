<script lang="ts" setup>
  import type { TableKey } from '@/schema'
  import type { AnyColumn, SchemaColumn, TableSchema, VirtualColumn } from '@/schema/types'
  import { mdiLockOutline } from '@mdi/js'
  import { computed } from 'vue'
  import { useTableList } from '@/composables/data/useTable'
  import { schemas } from '@/schema'
  import { presentValues } from '@/schema/filter'
  import { sortRows } from '@/schema/sort'
  import { allColumns, formatColumnValue } from '@/schema/types'
  import { useTablesStore } from '@/stores/tables'

  const props = defineProps<{
    schema: TableSchema
    errors?: Record<string, string>
    // 只顯示這幾個欄位（順序仍照 formOrder）；省略就是全部
    only?: readonly string[]
    // 修改既有的列時為 true：主鍵那一欄唯讀
    lockId?: boolean
  }>()

  // 用 object，實際存取時再轉型（見 schema/types.ts 的 formatColumnValue）
  const model = defineModel<object>({ required: true })

  // formOrder 可排進虛擬欄位（唯讀顯示）；省略 formOrder 時只有真實欄位
  const orderedColumns = computed<AnyColumn[]>(() => {
    const columns = props.schema.formOrder
      ? props.schema.formOrder
        .map(key => allColumns(props.schema).find(column => column.key === key))
        .filter((column): column is AnyColumn => column !== undefined)
      : props.schema.columns

    return props.only ? columns.filter(column => props.only?.includes(column.key)) : columns
  })

  function isVirtual (column: AnyColumn): column is VirtualColumn {
    return 'value' in column
  }

  function fieldValue (column: SchemaColumn): string | number | Date | null {
    return (model.value as Record<string, unknown>)[column.key] as string | number | Date | null
  }

  function setFieldValue (column: SchemaColumn, value: string | number | boolean | Date | null) {
    model.value = { ...model.value, [column.key]: value }
  }

  function numberValue (column: SchemaColumn): number | null {
    return fieldValue(column) as number | null
  }

  function dateValue (column: SchemaColumn): Date | null {
    return fieldValue(column) as Date | null
  }

  function textValue (column: SchemaColumn): string | null {
    return fieldValue(column) as string | null
  }

  function setTextValue (column: SchemaColumn, value: string) {
    setFieldValue(column, value === '' ? null : value)
  }

  // boolean 以 'true'／'false' 交給按鈕組；空的是 undefined，兩顆都不選
  function booleanKey (column: SchemaColumn): string | undefined {
    const value = (model.value as Record<string, unknown>)[column.key]
    return typeof value === 'boolean' ? String(value) : undefined
  }

  // 按鈕組取消選取時回傳 undefined，即清空
  function setBooleanValue (column: SchemaColumn, key: unknown) {
    setFieldValue(column, key === 'true' ? true : (key === 'false' ? false : null))
  }

  // 各種輸入元件共用的屬性：標籤、錯誤訊息，以及唯讀（虛擬欄位、建立後的主鍵）與主鍵的提示。
  // 唯讀時字色變淡，仍可選取複製；建立後的主鍵另加鎖頭
  function fieldProps (column: AnyColumn) {
    const isId = column.key === props.schema.idColumn
    const idLocked = isId && props.lockId
    const locked = isVirtual(column) || idLocked
    return {
      errorMessages: props.errors?.[column.key] ?? [],
      label: column.label,
      readonly: locked,
      class: locked ? 'data-form__locked' : undefined,
      prependInnerIcon: idLocked ? mdiLockOutline : undefined,
      hint: isId && !props.lockId && props.schema.newId ? '留空即自動產生' : undefined,
      persistentHint: isId,
    }
  }

  // 數字欄位的 min／max／step；沒設時交給 v-number-input 的預設
  function numberOption (column: SchemaColumn, option: 'min' | 'max' | 'step'): number | undefined {
    return column.type === 'number' ? column[option] : undefined
  }

  // ref 欄位的選項就是對方整張表（共用快取）：值是 id、文字是對方的 $label，照對方的 defaultSort 排
  const refLists = new Map(
    props.schema.columns
      .filter(column => column.type === 'ref')
      .map(column => [column.key, useTableList<{ id: string, $label: string }>(column.refTable as TableKey)] as const),
  )

  function refItems (column: SchemaColumn): { id: string, title: string }[] {
    if (column.type !== 'ref') {
      return []
    }
    const list = refLists.get(column.key)
    return list
      ? sortRows(list.data.value, schemas[column.refTable as TableKey]).map(row => ({ id: row.id, title: row.$label }))
      : []
  }

  function refLoading (column: SchemaColumn): boolean {
    return refLists.get(column.key)?.loading.value ?? false
  }

  // suggestFromData 要讀自己這張表的列。DataForm 只拿到 schema，從 schemas 反查代稱（schema 物件是單例）
  const ownTable = (Object.keys(schemas) as TableKey[]).find(key => schemas[key] === props.schema)
  const wantsOwnRows = props.schema.columns.some(column => column.type === 'select' && column.suggestFromData)
  const ownList = ownTable && wantsOwnRows ? useTableList<object>(ownTable) : null

  // combobox 的建議：options 全部照原順序在前，開了 suggestFromData 再接資料裡多出來的值（跟篩選抽屜同一個排法）
  function suggestions (column: SchemaColumn): string[] {
    if (column.type !== 'select') {
      return []
    }
    if (!column.suggestFromData || !ownList) {
      return column.options
    }
    return [...column.options, ...presentValues(ownList.data.value, column).extra]
  }

  // 虛擬欄位的值：表單的 row 是普通複本，先掛上與快取相同的 getter，讀父列的虛擬欄位才算得出來，並隨輸入重算
  const store = useTablesStore()
  const rowWithGetters = computed(() => ownTable ? store.withGetters(ownTable, model.value) : model.value)

  function virtualText (column: VirtualColumn): string {
    return formatColumnValue(rowWithGetters.value, column)
  }
</script>

<template>
  <v-container class="schema-form-fields">
    <template v-for="column in orderedColumns" :key="column.key">
      <v-text-field
        v-if="isVirtual(column)"
        v-bind="fieldProps(column)"
        :model-value="virtualText(column)"
      />

      <!-- −／＋ 都在右側、以 inset 呈現（預設是上下箭頭，以 slot 換掉圖示）；不限制小數位數，輸入的值不會被四捨五入 -->
      <v-number-input
        v-else-if="column.type === 'number'"
        v-bind="fieldProps(column)"
        inset
        :max="numberOption(column, 'max')"
        :min="numberOption(column, 'min')"
        :model-value="numberValue(column)"
        :precision="null"
        :step="numberOption(column, 'step')"
        @update:model-value="(value) => setFieldValue(column, value)"
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
        v-bind="fieldProps(column)"
        append-inner-icon="$calendar"
        input-format="yyyy/mm/dd"
        :model-value="dateValue(column)"
        prepend-icon=""
        @update:model-value="(value) => setFieldValue(column, value)"
      />

      <!-- 否／是兩顆互斥的按鈕；再按一次已選的那顆即清空 -->
      <v-input
        v-else-if="column.type === 'boolean'"
        class="data-form__boolean"
        :error-messages="fieldProps(column).errorMessages"
      >
        <span class="data-form__boolean-label">{{ column.label }}</span>

        <v-btn-toggle
          class="data-form__boolean-toggle"
          density="comfortable"
          divided
          :model-value="booleanKey(column)"
          variant="outlined"
          @update:model-value="(value: unknown) => setBooleanValue(column, value)"
        >
          <v-btn value="false">否</v-btn>
          <v-btn value="true">是</v-btn>
        </v-btn-toggle>
      </v-input>

      <!-- 時長使用一般文字框，不使用原生的 type="time" -->
      <v-text-field
        v-else-if="column.type === 'duration'"
        v-bind="fieldProps(column)"
        :model-value="textValue(column)"
        placeholder="時:分:秒"
        @update:model-value="(value) => setTextValue(column, value)"
      />

      <!-- allowCustom：options 只是建議，打了清單外的字也直接當值 -->
      <v-combobox
        v-else-if="column.type === 'select' && column.allowCustom"
        v-bind="fieldProps(column)"
        :items="suggestions(column)"
        :model-value="textValue(column)"
        @update:model-value="(value) => setTextValue(column, value)"
      />

      <v-select
        v-else-if="column.type === 'select'"
        v-bind="fieldProps(column)"
        :items="column.options"
        :model-value="textValue(column)"
        @update:model-value="(value) => setTextValue(column, value)"
      />

      <v-autocomplete
        v-else-if="column.type === 'ref'"
        clearable
        v-bind="fieldProps(column)"
        item-title="title"
        item-value="id"
        :items="refItems(column)"
        :loading="refLoading(column)"
        :model-value="textValue(column)"
        @update:model-value="(value) => setFieldValue(column, value)"
      />

      <v-text-field
        v-else
        v-bind="fieldProps(column)"
        :model-value="textValue(column)"
        @update:model-value="(value) => setTextValue(column, value)"
      />
    </template>
  </v-container>
</template>

<style scoped>
/* 唯讀的欄位（虛擬欄位、建立後的主鍵）：值的字色變淡，與可編輯的欄位區分 */
.data-form__locked :deep(.v-field__input) {
  opacity: var(--v-medium-emphasis-opacity);
}

.data-form__boolean :deep(.v-input__control) {
  display: grid;
  grid-template-columns: 30% 70%;
  align-items: center;
}

.data-form__boolean-label {
  padding-inline-start: var(--v-field-padding-start, 16px);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.data-form__boolean-toggle {
  justify-self: center;
  width: 70%;
}

.data-form__boolean-toggle :deep(.v-btn) {
  flex: 1 1 0;
}
</style>
