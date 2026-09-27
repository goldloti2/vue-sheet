# GroupedList

多層可收合分組。分組資料用 `groupRows(rows, levels)` 算好再傳進來，元件本身不管怎麼分。`levels` 由外到內，每層要 `sortKey`（排序用）與 `label`（顯示用）兩個函式——分開是刻意的，直接拿顯示字串排序會出錯。

**列表頁通常不直接用它**：[ListPage](ListPage.md) 的 `groups` prop 就是把分組交給它渲染，順便把載入狀態、FAB 與列表順序（會先 `flattenGroups`）一起處理好。直接用的場合是詳細頁的 slot、對話框那種不是整頁列表的地方。

自己用的話別在外層用 `v-if="loading"` / `v-else` 包住它——`loading` 一 toggle 會整個卸載重建，展開狀態就沒了（同步鈕會重抓所有已載入的表，所以這件事很常發生）。用 [PageState](PageState.md) 的 `spinner="linear"`，它把進度條加在內容上面而不是取代內容。

## Usage

```vue
<script lang="ts" setup>
  import type { GroupLevel } from '@/schema/types'
  import { computed } from 'vue'
  import GroupedList from '@/components/ui/list/GroupedList.vue'
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
