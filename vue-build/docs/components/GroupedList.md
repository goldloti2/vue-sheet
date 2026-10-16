# GroupedList

多層可收合分組，每層標題後面用 [CountLabel](CountLabel.md) 標出底下有幾筆。分組資料用 `groupRows(rows, levels)` 算好再傳進來，元件本身不管怎麼分。`levels` 由外到內，每層要 `sortKey`（排序用）與 `label`（顯示用）兩個函式——分開是刻意的，直接拿顯示字串排序會出錯。

**列表頁通常不直接用它**：[ListPage](ListPage.md) 的 `groups` prop 就是把分組交給它渲染，順便把載入狀態、FAB 與列表順序（會先 `flattenGroups`）一起處理好。直接用的場合是詳細頁的 slot、對話框那種不是整頁列表的地方。

自己用的話別在外層用 `v-if="loading"` / `v-else` 包住它——`loading` 一 toggle 會整個卸載重建，展開狀態就沒了（同步鈕會重抓所有已載入的表，所以這件事很常發生）。用 [PageState](PageState.md) 的 `spinner="linear"`，它把進度條加在內容上面而不是取代內容。

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

`label` 可回傳 `null`，表示這一列於此層不再往下分：

- **這些列併成一個沒有標題的子組**（不論是否相鄰），置於第一次出現之處；同一組中其餘的列照常分組
- **整組皆為 `null` 時，外層的那一組仍可收合**，展開後直接列出各列，不出現下一層的標題。例如外層有一組「待處理」，與其他組一樣可收合，底下不再依月份細分
- **排序仍依每一層的 `sortKey`**：回傳 `null` 的列在該層的 `sortKey` 依然生效，須給出合理的值

```ts
const groupLevels: GroupLevel<Row>[] = [
  {
    sortKey: row => isPending(row) ? -1 : (row.date?.getFullYear() ?? 0),
    label: row => isPending(row) ? '待處理' : (row.date ? `${row.date.getFullYear()}年` : '未知'),
  },
  {
    // 年份一併計入，跨年的列（例如「待處理」這組）才不會排錯
    sortKey: row => row.date ? row.date.getFullYear() * 12 + row.date.getMonth() : 0,
    label: row => isPending(row) ? null : (row.date ? `${row.date.getMonth() + 1}月` : '未知'),
  },
]
```

## 只有一組時固定展開

某一層只有一組時（例如篩選後只剩「2026年」），該組固定展開且不可收合：標題列不能點擊，亦不顯示收合的箭頭。每一層各自判斷，展開後下一層若也只有一組（例如只剩一個月份），同樣固定展開；有兩組以上的層照常收合。

- **組數改變時重新判斷**：例如搜尋或 dashboard 的互動使組數變為一，那一組隨即展開；組數恢復為兩組以上時，那一組維持展開，可照常收合
- 以 `v-list` 的 `opened` 控制展開狀態，縮排與展開的動畫與一般的組相同

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `groups` | `RowGroup<Row>[]` | **必填**，`groupRows()` 的回傳值 |
| `path` | `string?` | 巢狀遞迴自己用的，外部不用傳 |
| `layout` | `'list' \| 'grid'?` | 每組底下各筆的排法，預設 `'list'`；組的標題一律佔一整行，見 [ListLayout](ListLayout.md) |

## Slots

| slot | 參數 | 說明 |
| --- | --- | --- |
| `default` | `{ row }` | 每一列怎麼畫，通常放 `DataList`；亦可放 `DataProfile`、`DataCard` 或 `DataGallery`（後者須搭配 `layout="grid"`） |

## 備註

- **`v-list` 的 `overflow` 改為 `visible`**：`v-list` 預設為 `overflow: auto`，而卡片的寬度恰好撐滿它，profile、card、gallery 往右下的陰影會被裁切。巢狀的各層皆套用
- **分組內容左右各外擴陰影的範圍**：展開與收合的動畫期間，Vuetify 會於 `.v-list-group__items` 暫設 `overflow: hidden`，無法移除（否則尚未展開的內容會溢出）。因此該層以負的 `margin-inline` 外擴、再以 `padding-inline` 抵銷，兩者皆為 `--list-card-shadow-extent`（見 [ListLayout](ListLayout.md) 的「共用的樣式」）。內容的位置與寬度不變，裁切範圍則涵蓋陰影；下方的陰影落在各元件的下方間距內（gallery 由 `ListLayout` 的格線提供）
