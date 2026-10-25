<script lang="ts" setup>
  import type { ListTable } from '@/composables/shell/useListControls'
  import type { ColumnFilter, Filters } from '@/schema/filter'
  import type { AnyColumn } from '@/schema/types'
  import { mdiChevronLeft, mdiChevronRight, mdiCircle, mdiInformationOutline } from '@mdi/js'
  import { computed, shallowRef, watch } from 'vue'
  import TableChips from '@/components/ui/shell/TableChips.vue'
  import { filterableColumns, isActiveFilter, presentValues } from '@/schema/filter'
  import { booleanText, formatDate } from '@/schema/types'

  const props = defineProps<{
    // 每張表各有一份條件，同時生效。上方的表選單只決定目前編輯哪一張
    tables: ListTable[]
    // 頁面目前的頁籤。使用者未切換表時，面板跟隨此頁籤
    current?: string
    // 抽屜屬於 AppShell，此處只用於在關閉時回到原狀
    open: boolean
  }>()

  // 使用者在抽屜中選取的表。關閉時清空，下次開啟時重新跟隨 current
  const picked = shallowRef<string | null>(null)

  const table = computed(() => props.tables.find(item => item.schema.tableLabel === (picked.value ?? props.current)) ?? props.tables[0])

  // 修改即時生效，沒有套用按鈕。每次修改都指定新物件，讀取它的 computed 才會重算
  const filters = computed<Filters>(() => table.value?.filters.value ?? {})
  const columns = computed(() => table.value ? filterableColumns(table.value.schema) : [])

  // 第二層正在編輯的欄位。null 表示第一層的欄位清單，關閉時回到第一層
  const editing = shallowRef<AnyColumn | null>(null)
  watch(() => props.open, value => {
    if (!value) {
      editing.value = null
      picked.value = null
    }
  })

  // 切換表時回到欄位清單，因為第二層的欄位屬於上一張表
  const tableName = computed({
    get: () => table.value?.schema.tableLabel ?? '',
    set: value => {
      picked.value = value
      editing.value = null
    },
  })

  // 互動 dashboard 中，條件往下影響此表的上層表，以及其有條件的欄位
  const inherited = computed(() => (table.value?.inheritedFrom?.() ?? []).map(label => {
    const upper = props.tables.find(item => item.schema.tableLabel === label)
    const columns = upper
      ? filterableColumns(upper.schema).filter(column => isActiveFilter(upper.filters.value[column.key])).map(column => column.label)
      : []
    return { label, columns: columns.join('、') }
  }))

  // select 多一個「空白」選項，對應的值為 null
  const BLANK = '__blank__'

  interface SelectItem {
    title: string
    value: string
  }

  // 只列出資料中出現過的值，options 中的值依序在前。有空值時才加「(空白)」，置於最後
  function selectItems (column: AnyColumn): SelectItem[] {
    const { known, extra, hasBlank } = presentValues(table.value?.rows.value ?? [], column)
    const items = [...known, ...extra].map(value => ({ title: valueTitle(column, value), value }))
    if (hasBlank) {
      items.push({ title: '(空白)', value: BLANK })
    }
    return items
  }

  // 選項顯示的文字：boolean 的 'true'／'false' 顯示為是／否，select 即為值本身
  function valueTitle (column: AnyColumn, value: string): string {
    return column.type === 'boolean' ? booleanText(value === 'true') : value
  }

  function selectedValues (column: AnyColumn): string[] {
    return (filters.value[column.key]?.values ?? []).map(value => value ?? BLANK)
  }

  function patch (key: string, change: ColumnFilter) {
    if (table.value) {
      table.value.filters.value = { ...filters.value, [key]: { ...filters.value[key], ...change } }
    }
  }

  function toggleValue (column: AnyColumn, value: string) {
    const current = selectedValues(column)
    const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value]
    // 依 checkbox 的順序儲存。清單上已沒有的值接在後面，不刪除
    const shown = selectItems(column).map(item => item.value)
    const ordered = [...shown.filter(item => next.includes(item)), ...next.filter(item => !shown.includes(item))]
    patch(column.key, { values: ordered.map(item => item === BLANK ? null : item) })
  }

  // number、date 與 duration 的輸入元件共用 min、max，各自只取自己的型別
  function numberBound (column: AnyColumn, edge: 'min' | 'max'): number | null {
    const value = filters.value[column.key]?.[edge]
    return typeof value === 'number' ? value : null
  }

  function dateBound (column: AnyColumn, edge: 'min' | 'max'): Date | null {
    const value = filters.value[column.key]?.[edge]
    return value instanceof Date ? value : null
  }

  function durationBound (column: AnyColumn, edge: 'min' | 'max'): string | null {
    const value = filters.value[column.key]?.[edge]
    return typeof value === 'string' ? value : null
  }

  function isActive (column: AnyColumn): boolean {
    const filter = filters.value[column.key]
    return (filter?.values?.length ?? 0) > 0 || filter?.min != null || filter?.max != null
  }

  // 摘要的字數上限，超過時截斷並加上「…共 X 項」
  const SUMMARY_MAX = 12

  function rangeText (low: string, high: string): string {
    if (low && high) {
      return `${low} ～ ${high}`
    }
    return low ? `${low} ～` : `～ ${high}`
  }

  // 第一層每欄名稱下方的小字，顯示目前的條件。沒有條件時不顯示
  function summary (column: AnyColumn): string {
    const filter = filters.value[column.key]
    if (!filter || !isActive(column)) {
      return ''
    }

    if (filter.values && filter.values.length > 0) {
      const text = filter.values.map(value => value === null ? '(空白)' : valueTitle(column, value)).join('、')
      return text.length <= SUMMARY_MAX ? text : `${text.slice(0, SUMMARY_MAX)}…共 ${filter.values.length} 項`
    }

    if (column.type === 'duration') {
      return rangeText(durationBound(column, 'min') ?? '', durationBound(column, 'max') ?? '')
    }

    if (column.type === 'date') {
      const from = dateBound(column, 'min')
      const to = dateBound(column, 'max')
      return rangeText(from ? formatDate(from) : '', to ? formatDate(to) : '')
    }

    const min = numberBound(column, 'min')
    const max = numberBound(column, 'max')
    if (min !== null && max === null) {
      return `≥ ${min}`
    }
    if (min === null && max !== null) {
      return `≤ ${max}`
    }
    return rangeText(String(min), String(max))
  }

  // 只清除目前這張表的條件。關閉搜尋（App Bar 的 ←）時清除全部的表
  function clear () {
    if (table.value) {
      table.value.filters.value = {}
    }
  }
</script>

<template>
  <!-- 第一層：欄位清單，點選一欄後進入第二層 -->
  <template v-if="!editing">
    <v-toolbar density="compact" flat title="篩選">
      <v-btn text="清除" variant="text" @click="clear" />
    </v-toolbar>

    <TableChips v-model="tableName" :tables="tables" />

    <!-- 上層表的條件也影響此表，點選即切換至該表 -->
    <v-list v-if="inherited.length > 0" class="text-medium-emphasis" density="compact" lines="two">
      <v-list-item
        v-for="item in inherited"
        :key="item.label"
        :prepend-icon="mdiInformationOutline"
        :subtitle="item.columns"
        :title="`另受「${item.label}」的條件影響`"
        @click="tableName = item.label"
      >
        <template #append>
          <v-icon :icon="mdiChevronRight" />
        </template>
      </v-list-item>
    </v-list>

    <v-divider v-if="inherited.length > 0" />

    <v-list v-if="columns.length > 0" density="compact" lines="two">
      <v-list-item
        v-for="column in columns"
        :key="column.key"
        :subtitle="summary(column)"
        :title="column.label"
        @click="editing = column"
      >
        <template #append>
          <v-icon v-if="isActive(column)" color="primary" :icon="mdiCircle" size="10" />
          <v-icon class="ml-2" :icon="mdiChevronRight" />
        </template>
      </v-list-item>
    </v-list>

    <v-container v-else class="text-medium-emphasis">這張表沒有可篩選的欄位</v-container>
  </template>

  <!-- 第二層：單一欄位的條件，修改即時生效 -->
  <template v-else>
    <v-toolbar density="compact" flat :title="editing.label">
      <template #prepend>
        <v-btn aria-label="返回欄位清單" :icon="mdiChevronLeft" variant="text" @click="editing = null" />
      </template>
    </v-toolbar>

    <v-list v-if="editing.type === 'select' || editing.type === 'boolean'" density="compact">
      <v-list-item
        v-for="item in selectItems(editing)"
        :key="item.value"
        :title="item.title"
        @click="toggleValue(editing, item.value)"
      >
        <template #prepend>
          <v-checkbox-btn :model-value="selectedValues(editing).includes(item.value)" />
        </template>
      </v-list-item>
    </v-list>

    <v-container v-else-if="editing.type === 'number'" class="d-flex ga-2">
      <v-number-input
        clearable
        control-variant="hidden"
        density="compact"
        hide-details
        label="最小"
        :model-value="numberBound(editing, 'min')"
        :precision="null"
        @update:model-value="(value) => editing && patch(editing.key, { min: value })"
      />

      <v-number-input
        clearable
        control-variant="hidden"
        density="compact"
        hide-details
        label="最大"
        :model-value="numberBound(editing, 'max')"
        :precision="null"
        @update:model-value="(value) => editing && patch(editing.key, { max: value })"
      />
    </v-container>

    <v-container v-else-if="editing.type === 'duration'" class="d-flex ga-2">
      <v-text-field
        clearable
        density="compact"
        hide-details
        label="最短"
        :model-value="durationBound(editing, 'min')"
        placeholder="時:分:秒"
        @update:model-value="(value) => editing && patch(editing.key, { min: value || null })"
      />

      <v-text-field
        clearable
        density="compact"
        hide-details
        label="最長"
        :model-value="durationBound(editing, 'max')"
        placeholder="時:分:秒"
        @update:model-value="(value) => editing && patch(editing.key, { max: value || null })"
      />
    </v-container>

    <v-container v-else-if="editing.type === 'date'" class="d-flex flex-column ga-2">
      <v-date-input
        clearable
        density="compact"
        hide-details
        input-format="yyyy/mm/dd"
        label="從"
        :model-value="dateBound(editing, 'min')"
        @update:model-value="(value) => editing && patch(editing.key, { min: value })"
      />

      <v-date-input
        clearable
        density="compact"
        hide-details
        input-format="yyyy/mm/dd"
        label="到"
        :model-value="dateBound(editing, 'max')"
        @update:model-value="(value) => editing && patch(editing.key, { max: value })"
      />
    </v-container>
  </template>
</template>
