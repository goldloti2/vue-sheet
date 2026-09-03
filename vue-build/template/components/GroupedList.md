# GroupedList

多層可收合分組。分組資料用 `groupRows(rows, levels)` 算好再傳進來，元件本身不管怎麼分。`levels` 由外到內，每層要 `sortKey`（排序用）與 `label`（顯示用）兩個函式——分開是刻意的，直接拿顯示字串排序會出錯。

外層別用 `v-if="loading"` / `v-else` 包住它，`loading` 一 toggle 會整個卸載重建，展開狀態就沒了；改用 `v-progress-linear v-if="loading"` 搭配獨立的 `v-if="!error"`。

## Usage

```vue
<script lang="ts" setup>
  import type { GroupLevel } from '@/schema/types'
  import { computed } from 'vue'
  import GroupedList from '@/components/ui/GroupedList.vue'
  import { groupRows } from '@/schema/types'

  const groupLevels: GroupLevel<Row>[] = [
    {
      sortKey: row => row.欄位1 ?? 0,
      label: row => String(row.欄位1 ?? '未知'),
    },
  ]

  const groups = computed(() => groupRows(rows.value, groupLevels))
</script>

<template>
  <GroupedList :groups="groups">
    <template #default="{ row }">
      內容
    </template>
  </GroupedList>
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `groups` | `RowGroup<Row>[]` | **必填**，`groupRows()` 的回傳值 |
| `path` | `string?` | 巢狀遞迴自己用的，外部不用傳 |

## Slots

| slot | 參數 | 說明 |
| --- | --- | --- |
| `default` | `{ row }` | 每一列怎麼畫，通常放 `DataList` |
