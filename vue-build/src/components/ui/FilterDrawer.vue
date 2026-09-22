<script lang="ts" setup>
  import type { ColumnFilter, Filters } from '@/composables/useFilter'
  import type { AnyColumn, TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import { filterableColumns, presentValues } from '@/composables/useFilter'

  const props = defineProps<{
    schema: TableSchema
    // 還沒過濾的整表，select 只列裡面出現過的值
    rows: readonly object[]
  }>()

  const open = defineModel<boolean>('open', { required: true })
  // 改了就即時生效，沒有套用鈕。每次都給新物件，讀它的 computed 才會重算
  const filters = defineModel<Filters>({ required: true })

  const columns = computed(() => filterableColumns(props.schema))

  // select 多一個「空白」選項，對應值是 null
  const BLANK = '__blank__'

  interface SelectItem {
    title: string
    value: string
  }

  // 只列資料裡出現過的值（options 順序在前、多出來的接後面）；有空的才給「(空白)」
  function selectItems (column: AnyColumn): SelectItem[] {
    const { known, extra, hasBlank } = presentValues(props.rows, column)
    const items = [...known, ...extra].map(value => ({ title: value, value }))
    if (hasBlank) {
      items.push({ title: '(空白)', value: BLANK })
    }
    return items
  }

  // 全形（CJK、全形標點）算 1em，其他算 0.6em
  const FULL_WIDTH = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/

  function textWidthEm (text: string): number {
    let width = 0
    for (const char of text) {
      width += FULL_WIDTH.test(char) ? 1 : 0.6
    }
    return width
  }

  // 一列放幾顆由最長的那顆決定：欄的最小寬度 = 最長字串的估計寬度 + chip 內距，每欄等寬、每列顆數一樣
  function chipGridStyle (items: SelectItem[]): Record<string, string> {
    const widest = Math.max(0, ...items.map(item => textWidthEm(item.title)))
    return { gridTemplateColumns: `repeat(auto-fill, minmax(calc(${widest}em + 28px), 1fr))` }
  }

  function selectedValues (column: AnyColumn): string[] {
    return (filters.value[column.key]?.values ?? []).map(value => value ?? BLANK)
  }

  function patch (key: string, change: ColumnFilter) {
    filters.value = { ...filters.value, [key]: { ...filters.value[key], ...change } }
  }

  function toggleValue (column: AnyColumn, value: string) {
    const current = selectedValues(column)
    const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value]
    patch(column.key, { values: next.map(item => item === BLANK ? null : item) })
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

  function clear () {
    filters.value = {}
  }
</script>

<template>
  <v-navigation-drawer v-model="open" location="end" temporary width="320">
    <v-toolbar density="compact" flat title="篩選">
      <v-btn text="清除" variant="text" @click="clear" />
    </v-toolbar>

    <v-container>
      <template v-for="column in columns" :key="column.key">
        <div class="text-subtitle-2 mb-1">{{ column.label }}</div>

        <!-- grid 等寬排版，一列幾顆由最長的選項決定；v-chip-group 自己的 flex 排版做不到等寬，所以自己管選取 -->
        <div v-if="column.type === 'select'" class="filter-chips mb-4" :style="chipGridStyle(selectItems(column))">
          <v-chip
            v-for="item in selectItems(column)"
            :key="item.value"
            :color="selectedValues(column).includes(item.value) ? 'primary' : undefined"
            :text="item.title"
            :variant="selectedValues(column).includes(item.value) ? 'flat' : 'tonal'"
            @click="toggleValue(column, item.value)"
          />
        </div>

        <div v-else-if="column.type === 'number'" class="d-flex ga-2 mb-4">
          <v-number-input
            clearable
            control-variant="hidden"
            density="compact"
            hide-details
            label="最小"
            :model-value="numberBound(column, 'min')"
            @update:model-value="(value) => patch(column.key, { min: value })"
          />

          <v-number-input
            clearable
            control-variant="hidden"
            density="compact"
            hide-details
            label="最大"
            :model-value="numberBound(column, 'max')"
            @update:model-value="(value) => patch(column.key, { max: value })"
          />
        </div>

        <div v-else-if="column.type === 'date'" class="d-flex flex-column ga-2 mb-4">
          <v-date-input
            clearable
            density="compact"
            hide-details
            input-format="yyyy/mm/dd"
            label="從"
            :model-value="dateBound(column, 'min')"
            @update:model-value="(value) => patch(column.key, { min: value })"
          />

          <v-date-input
            clearable
            density="compact"
            hide-details
            input-format="yyyy/mm/dd"
            label="到"
            :model-value="dateBound(column, 'max')"
            @update:model-value="(value) => patch(column.key, { max: value })"
          />
        </div>
      </template>

      <div v-if="columns.length === 0" class="text-medium-emphasis">這張表沒有可篩選的欄位</div>
    </v-container>
  </v-navigation-drawer>
</template>

<style scoped>
  .filter-chips {
    display: grid;
    gap: 8px;
  }

  .filter-chips :deep(.v-chip) {
    justify-content: center;
  }
</style>
