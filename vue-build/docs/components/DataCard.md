# DataCard

card 式列表的**單一張卡片**：上下共四層，沒有內容的那一層整層隱藏。與 [DataProfile](DataProfile.md) 相同，卡片之間有間隔，點擊卡片進入 detail。

各位置由 card 專用的 view（`defineCardView`）指定，分為 `header`、`body` 兩組，每組可用的位置與 [DataList](DataList.md#view) 的 view 相同。自身不做迴圈：列表頁放在 [ListPage](ListPage.md) 的 slot 裡，其他地方用 `v-for` 或包在 `GroupedList` 的 slot 裡。給了 `to` 整張卡片就是連結。

多選的接法與 DataList 相同：`v-bind` 上 `ListPage` slot 給的 `props`（或自己組時用 `selection.itemProps(row.id)`），`selectable`／`selectMode`／`selected` 與長按、點選事件會一次綁好。

## Usage

```vue
<script lang="ts" setup>
  import DataCard from '@/components/ui/list/DataCard.vue'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { __table__Schema } from '@/schema/tables/__table__'
  import { defineCardView } from '@/schema/view'

  const { edit, delete: remove } = use__Table__Actions()
  const view = defineCardView(__table__Schema, {
    header: { title: 'owner', image: 'avatar' },
    body: { image: 'photo', title: 'name', subtitle: 'date', summary: 'note' },
    actions: row => [{ ...edit(row), display: 'text' }, null, null, remove(row)],
  })
</script>

<template>
  <ListPage table="__table__" :rows="rows" :selection="selection">
    <template #default="{ row, props: itemProps }">
      <DataCard v-bind="itemProps" :row="row" :to="`/__table__/${row.id}`" :view="view" />
    </template>
  </ListPage>
</template>
```

## 四層

| 層 | 來源 | 內容 |
| --- | --- | --- |
| 1 | `header` | 左側 40×40 的圓形頭像（`image`），右側上下排列主標題（`title`）與副標題（`subtitle`），過長時以省略號截斷；沒有選單 |
| 2 | `body.image` | 寬度撐滿卡片的大圖，固定 16:9、裁切填滿（`object-fit: cover`） |
| 3 | `body` | 標題（`title`）、副標題（`subtitle`）與摘要（`summary`）；摘要可換行，最多三行 |
| 4 | `actions` | 最多四格，由 [ViewActions](ViewActions.md) 的 `variant="slots"` 呈現：前兩個靠左、後兩個靠右，`null` 保留為空格，超過四個的部分不顯示。每一格依 `display` 顯示為圖示或文字 |

- 第 1 層的三個位置皆無內容時隱藏；第 3 層亦同。第 2 層僅於有圖片時出現；第 4 層於四格皆為 `null` 時隱藏，多選模式下亦隱藏
- `header` 與 `body` 各自指定欄位，可放相同或不同的欄位；`aside` 不顯示

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，要顯示的那一列 |
| `view` | `CardView<Row>` | **必填**，`defineCardView` 的回傳值 |
| `to` | `string?` | 有給才是連結；沒給就是純顯示的一張卡片 |
| `selectable` | `boolean?` | 預設 `false`。開了才綁長按監聽、才會禁止文字選取與拖曳 |
| `selectMode` | `boolean?` | 目前在不在多選模式 |
| `selected` | `boolean?` | 這一張有沒有被選 |

## Emits

| event | 說明 |
| --- | --- |
| `longpress` | 長按觸發，只有 `selectable` 時會發 |
| `toggle` | 多選模式下點擊觸發；此時不會導覽 |

## 備註

- **連結與 DataList 相同**：自行組 `href` 的 `<a>`，不使用 `RouterLink`，與 DataList、DataProfile 共用 `useRowClick`（理由見 [DataList](DataList.md) 的備註）。第 4 層與連結並列，不包在 `<a>` 內；第 4 層本身不接收點擊，僅按鈕接收，因此按鈕之間的空白處仍屬於連結
- **勾選圖示疊於卡片左上角**：多選模式下以絕對定位疊於左上角，不受各層有無內容影響；圖示帶有卡片底色的圓形背景，疊在大圖上亦可辨識。被選取的卡片疊上一層主色淡底
- **間隔由元件自身負責**：卡片帶有下方間距、圓角、外框與偏向右下的陰影，`ListPage` 與 `GroupedList` 不需另外設定。間距、圓角、陰影與點擊、選取的樣式定義於 `src/styles/list.css`，與其他列表元件共用（見 [ListLayout](ListLayout.md) 的「共用的樣式」）
- **`content-visibility: auto`**：畫面外的卡片不進行排版與繪製。因各層可隱藏、卡片高度差異大，`contain-intrinsic-size` 不寫死，而是依出現的層加總出替代高度，以 inline style 指定（第 1 層 64px、第 2 層以 180px 估計、第 3 層依出現的欄位、第 4 層 48px）。各層的版型若大幅變動，此計算須一併調整
