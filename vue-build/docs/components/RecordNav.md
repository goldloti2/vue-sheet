# RecordNav

detail 頁左右兩側的「上一筆／下一筆」箭頭。順序來自**列表頁當下實際顯示的順序**（含篩選、頁籤、分組），所以從「已出貨」頁籤進來就只會在已出貨那幾筆之間翻。頭尾不輪轉——到頭了那一側的按鈕直接消失。

要先在列表頁呼叫 `useListOrder` 發布順序，這個元件才有東西可用。沒有發布過、或目前這筆不在清單裡（例如重新整理、直接貼網址、從別張表的關聯連結跳進來），兩顆按鈕都不會出現。

切換用 `router.replace`，連續翻十筆不會在歷史裡留下十筆，按返回直接回列表。

## Usage

列表頁發布順序：

```vue
<script lang="ts" setup>
  import { computed } from 'vue'
  import { useListOrder } from '@/composables/navigation/useListOrder'
  import { useSortedTableList } from '@/composables/data/useSortedTableList'
  import { __table__Schema } from '@/schema/__table__'

  const { data } = useSortedTableList<__Table__Row>('__table__', __table__Schema)

  useListOrder('__table__', computed(() => data.value.map(row => row.id)))
</script>
```

有分組的話要發布攤平後的順序，`flattenGroups` 給的就是畫面上由上往下的順序：

```ts
useListOrder('__table__', computed(() => flattenGroups(groupedData.value).map(row => row.id)))
```

detail 頁：

```vue
<script lang="ts" setup>
  // vite-plugin-vuetify 只自動匯入元件、不含指令，v-touch 要自己 import
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
| `table` | `TableKey` | **必填**，要跟 `useListOrder` 發布時用的同一個 |
| `id` | `string` | **必填**，目前這筆的 id，用 `useRouteId()` 取 |

## 備註

- 假設 detail 頁的路徑是 `/表名/:id`，也就是檔案式路由的既定慣例
- 按鈕是 teleport 到 `body` 的，理由跟 `PageFab` 一樣：頁面轉場中的 `transform` 會讓祖先變成 `fixed` 的定位基準，不 teleport 就會跟著頁面橫移
- `v-touch` 綁在哪個元素上決定手勢的有效範圍。**detail 頁裡如果有可橫向捲動的 `DataTable`，兩者會搶手勢**，需要的話把 `v-touch` 綁在更內層、避開表格的元素上
- 換頁動畫的左右方向由 `router/index.ts` 的第 3 層規則決定（同路由換 id → 依列表順序），不需要另外設定
