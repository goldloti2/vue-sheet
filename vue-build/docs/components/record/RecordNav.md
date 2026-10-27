# RecordNav

詳細頁左右兩側的「上一列」「下一列」箭頭。
- 順序來自**點擊一列時列表實際顯示的順序**，包括篩選、頁籤與分組。例如從「已出貨」頁籤進入，就只在已出貨的那幾列之間切換
- 頭尾不循環：到頭時，該側的按鈕直接消失

列表須先發布順序，此元件才有順序可用。`ListPage` 於點擊一列時發布。以下情況兩個按鈕皆不出現：
- 沒有發布過順序
- 目前這一列不在清單中，例如重新整理、直接貼上網址、從其他表的關聯連結進入

切換使用 `router.replace`。連續切換十列，歷史紀錄中也不會留下十筆，按返回直接回到列表。

## Usage

不使用 `ListPage` 的列表頁，以 `provideListOrder` 提供畫面上的順序。其中的 `DataList`、`DataProfile`、`DataCard`、`DataGallery` 與 `DataTable` 被點擊時，發布這份順序：

```vue
<script lang="ts" setup>
  import { computed } from 'vue'
  import { provideListOrder } from '@/composables/navigation/useListOrder'
  import { useSortedTableList } from '@/composables/data/useTable'
  import { __table__Schema } from '@/schema/tables/__table__'

  const { data } = useSortedTableList<__Table__Row>('__table__', __table__Schema)

  provideListOrder('__table__', computed(() => data.value.map(row => row.id)))
</script>
```

有分組時，須提供攤平後的順序。`flattenGroups` 提供的即為畫面上由上往下的順序：

```ts
import { flattenGroups } from '@/schema/group'

provideListOrder('__table__', computed(() => flattenGroups(groupedData.value).map(row => row.id)))
```

不經由列的點擊時（例如圖表點擊一組），以 `publishListOrder(table, ids)` 直接發布。

詳細頁：

```vue
<script lang="ts" setup>
  // v-touch 須自行 import：vite-plugin-vuetify 只自動匯入元件，不含指令
  import { Touch as vTouch } from 'vuetify/directives'
  import RecordNav from '@/components/ui/record/RecordNav.vue'
  import { useSiblingNav } from '@/composables/navigation/useListOrder'
  import { useRouteId } from '@/composables/navigation/useRouteId'

  const id = useRouteId()
  const { swipe } = useSiblingNav('__table__', id)
</script>

<template>
  <div v-touch="swipe">
    內容123

    <RecordNav :id="id" table="__table__" />
  </div>
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填**，須與發布順序時使用的表相同 |
| `id` | `string` | **必填**，目前這一列的 id，以 `useRouteId()` 取得 |

## 備註

- 此元件假設詳細頁的路徑為 `/表名/:id`，即檔案式路由的既定慣例
- 按鈕與 `PageFab` 相同，teleport 至 `body`。換頁動畫中，按鈕另有 `view-transition-name`，不隨頁面滑動
- `v-touch` 綁定的元素決定手勢的有效範圍。**詳細頁中有可橫向捲動的 `DataTable` 時，兩者會搶手勢**。須避開時，把 `v-touch` 綁在更內層、不含表格的元素上
- 換頁動畫的左右方向由 `router/index.ts` 的第 4 層規則決定（同一路由換 id 時，依列表順序），無須另外設定
