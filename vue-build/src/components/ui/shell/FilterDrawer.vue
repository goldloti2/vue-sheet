<script lang="ts" setup>
  import type { ColumnFilter, Filters } from '@/composables/data/useFilter'
  import type { SearchTable } from '@/composables/shell/useAppBarSearch'
  import type { AnyColumn } from '@/schema/types'
  import { mdiChevronLeft, mdiChevronRight, mdiCircle } from '@mdi/js'
  import { computed, shallowRef, watch } from 'vue'
  import { filterableColumns, presentValues } from '@/composables/data/useFilter'
  import { formatDate } from '@/schema/types'

  const props = defineProps<{
    // 每張表各自一份條件、同時生效；上方的表選單只決定現在編哪一張
    tables: SearchTable[]
    // 頁面的頁籤，沒被使用者換過就跟著它
    current?: string
  }>()

  const open = defineModel<boolean>('open', { required: true })

  // 使用者在抽屜裡點的表；關起來就忘掉，下次打開重新跟著 current
  const picked = shallowRef<string | null>(null)

  const table = computed(() => props.tables.find(item => item.schema.sheetName === (picked.value ?? props.current)) ?? props.tables[0])

  // 改了就即時生效，沒有套用鈕。每次都給新物件，讀它的 computed 才會重算
  const filters = computed<Filters>(() => table.value?.filters.value ?? {})
  const columns = computed(() => table.value ? filterableColumns(table.value.schema) : [])

  // 第二層正在編哪一欄；null 就是第一層的欄位清單。關起來回到第一層
  const editing = shallowRef<AnyColumn | null>(null)
  watch(open, value => {
    if (!value) {
      editing.value = null
      picked.value = null
    }
  })

  // 換表就回到欄位清單：第二層那一欄是上一張表的
  const tableName = computed({
    get: () => table.value?.schema.sheetName ?? '',
    set: value => {
      picked.value = value
      editing.value = null
    },
  })

  // select 多一個「空白」選項，對應值是 null
  const BLANK = '__blank__'

  interface SelectItem {
    title: string
    value: string
  }

  // 只列資料裡出現過的值（options 順序在前、多出來的接後面）；有空的才給「(空白)」，放最後
  function selectItems (column: AnyColumn): SelectItem[] {
    const { known, extra, hasBlank } = presentValues(table.value?.rows.value ?? [], column)
    const items = [...known, ...extra].map(value => ({ title: value, value }))
    if (hasBlank) {
      items.push({ title: '(空白)', value: BLANK })
    }
    return items
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
    // 照 checkbox 的順序存，摘要就不用再排一次；清單上沒有的值（資料變了）接在後面，不會被靜默刪掉
    const shown = selectItems(column).map(item => item.value)
    const ordered = [...shown.filter(item => next.includes(item)), ...next.filter(item => !shown.includes(item))]
    patch(column.key, { values: ordered.map(item => item === BLANK ? null : item) })
  }

  // 同一個 min / max 欄位給 number 與 date 兩種輸入元件用，各自只取自己那種型別
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

  // 摘要的字數上限，超過就截斷改成「…共 X 項」
  const SUMMARY_MAX = 12

  function rangeText (low: string, high: string): string {
    if (low && high) {
      return `${low} ～ ${high}`
    }
    return low ? `${low} ～` : `～ ${high}`
  }

  // 第一層每欄名稱底下那行小字：目前設了什麼條件。沒設就不顯示
  function summary (column: AnyColumn): string {
    const filter = filters.value[column.key]
    if (!filter || !isActive(column)) {
      return ''
    }

    if (filter.values && filter.values.length > 0) {
      const text = filter.values.map(value => value ?? '(空白)').join('、')
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

  // 只清現在這張表的；要全部清掉就關掉搜尋（App Bar 的 ←）
  function clear () {
    if (table.value) {
      table.value.filters.value = {}
    }
  }
</script>

<template>
  <v-navigation-drawer v-model="open" location="end" temporary width="320">
    <!-- 第一層：欄位清單，點一欄才進去填值 -->
    <template v-if="!editing">
      <v-toolbar density="compact" flat title="篩選">
        <v-btn text="清除" variant="text" @click="clear" />
      </v-toolbar>

      <!-- 多張表才需要選；每張表的條件是分開的，同時生效 -->
      <v-chip-group
        v-if="tables.length > 1"
        v-model="tableName"
        class="px-3 pt-0"
        mandatory
        selected-class="text-primary"
      >
        <v-chip
          v-for="item in tables"
          :key="item.schema.sheetName"
          size="small"
          :text="item.schema.sheetName"
          :value="item.schema.sheetName"
        />
      </v-chip-group>

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

    <!-- 第二層：單一欄位的值，改了就即時生效 -->
    <template v-else>
      <v-toolbar density="compact" flat :title="editing.label">
        <template #prepend>
          <v-btn aria-label="返回欄位清單" :icon="mdiChevronLeft" variant="text" @click="editing = null" />
        </template>
      </v-toolbar>

      <v-list v-if="editing.type === 'select'" density="compact">
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
          @update:model-value="(value) => editing && patch(editing.key, { min: value })"
        />

        <v-number-input
          clearable
          control-variant="hidden"
          density="compact"
          hide-details
          label="最大"
          :model-value="numberBound(editing, 'max')"
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
  </v-navigation-drawer>
</template>
