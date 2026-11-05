# GroupedList

多層、可收合的分組。每一層的標題後面以 [CountLabel](CountLabel.md) 標示組中的列數。
- 分組資料由 `groupRows(rows, levels)` 算好後傳入，元件本身不決定分法
- `levels` 由外到內排列，每一層須提供 `sortKey`（排序用）與 `label`（顯示用）兩個函式

**列表頁通常不直接使用此元件**。[ListPage](../page/ListPage.md) 的 `groups` prop 即是把分組交給此元件顯示，並一併處理載入狀態、FAB 與列表順序（發布前先 `flattenGroups`）。直接使用的場合為詳細頁的 slot、對話框等不是整頁列表的地方。

直接使用時，不在外層以 `v-if="loading"`／`v-else` 包住此元件。改用 [PageState](../page/PageState.md) 的 `spinner="linear"`，進度條會加在內容上方，不取代內容。

## Usage

```vue
<script lang="ts" setup>
  import type { GroupLevel } from '@/schema/group'
  import { computed } from 'vue'
  import GroupedList from '@/components/ui/list/GroupedList.vue'
  import { groupRows } from '@/schema/group'

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

## 不再往下分的列

`label` 可回傳 `null`，表示這一列在此層不再往下分：

- **這些列併成一個沒有標題的子組**，不論是否相鄰。子組置於這些列第一次出現之處。同一組中其餘的列照常分組
- **整組皆為 `null` 時，外層的那一組仍可收合**。展開後直接列出各列，不出現下一層的標題。例如外層有一組「待處理」，與其他組一樣可收合，組中不再依月份細分
- **排序仍依每一層的 `sortKey`**：回傳 `null` 的列，其在該層的 `sortKey` 依然生效，須提供合理的值

```ts
const groupLevels: GroupLevel<Row>[] = [
  {
    sortKey: row => isPending(row) ? -1 : (row.date?.getFullYear() ?? 0),
    label: row => isPending(row) ? '待處理' : (row.date ? `${row.date.getFullYear()}年` : '未知'),
  },
  {
    // 排序鍵含年份，跨年的列（例如「待處理」這組）依時間先後排列
    sortKey: row => row.date ? row.date.getFullYear() * 12 + row.date.getMonth() : 0,
    label: row => isPending(row) ? null : (row.date ? `${row.date.getMonth() + 1}月` : '未知'),
  },
]
```

## 只有一組時固定展開

某一層只有一組時（例如篩選後只剩「2026年」），該組固定展開，不可收合：標題列無法點擊，也不顯示收合的箭頭。

- 每一層各自判斷。展開後下一層若也只有一組（例如只剩一個月份），該組同樣固定展開。有兩組以上的層照常收合
- **組數改變時重新判斷**：例如搜尋或 dashboard 面板的 `scope` 使組數變為一，那一組隨即展開。組數恢復為兩組以上時，那一組維持展開，可照常收合
- 元件以 `v-list` 的 `opened` 控制展開狀態。縮排與展開的動畫與一般的組相同

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `groups` | `RowGroup<Row>[]` | **必填**，`groupRows()` 的回傳值 |
| `path` | `string?` | 元件巢狀遞迴時內部使用，外部無須傳入 |
| `layout` | `'list' \| 'grid'?` | 每一組中各列的排法，預設 `'list'`。組的標題一律佔一整行，見 [ListLayout](ListLayout.md) |

## Slots

| slot | 參數 | 說明 |
| --- | --- | --- |
| `default` | `{ row }` | 每一列的呈現，通常放 `DataList`。也可放 `DataProfile`、`DataCard` 或 `DataGallery`，`DataGallery` 須搭配 `layout="grid"` |

## 備註

- **`v-list` 的 `overflow` 改為 `visible`，上下的內距改為 0**，巢狀的各層皆套用。組的標題因此貼齊外緣
- **卡片的陰影落在 `ListLayout` 的留白之內**（見 [ListLayout](ListLayout.md) 的「留白」），展開與收合的動畫期間不被裁切
- **`.v-list-group__items` 的 `min-width` 改回 0**，Vuetify 的預設為 `min-content`
