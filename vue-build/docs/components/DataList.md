# DataList

卡片式列表（deck）的**單一列**：左側為縮圖，右側四個角落各顯示一個欄位。各欄位的位置由 **view** 指定（`defineView`，見下方），格式化由元件依欄位型別處理。自己不做迴圈：列表頁放在 [ListPage](ListPage.md) 的 slot 裡（迴圈與分組都由它處理），其他地方用 `v-for` 或包在 `GroupedList` 的 slot 裡。給了 `to` 整列就是連結。

多選的四個 prop 不用一個個接——`v-bind` 上 `ListPage` slot 給的 `props`（或自己組時用 `selection.itemProps(row.id)`），`selectable`／`selectMode`／`selected` 與長按、點選事件會一次綁好。

## Usage

```vue
<script lang="ts" setup>
  import DataList from '@/components/ui/list/DataList.vue'
  import { __table__Schema } from '@/schema/tables/__table__'
  import { defineView } from '@/schema/view'

  const view = defineView(__table__Schema, { title: 'name', subtitle: 'date', summary: 'amount' })
</script>

<template>
  <DataList
    :row="row"
    :select-mode="selectMode"
    selectable
    :selected="selected"
    to="/路徑"
    :view="view"
    @longpress="handleLongpress"
    @toggle="handleToggle"
  />
</template>
```

## view

`defineView(schema, { … })` 定義於頁面中，回傳一個函式：傳入一列，回傳各位置應顯示的內容。欄位定義在建立時即查找完畢，之後每一列僅需讀值與格式化。

每個位置皆可省略，省略者即為空白，不套用任何預設值。可填入的值為 schema 的欄位 key（真實或虛擬欄位皆可），以及每列皆有的 `id`、`$label`。

| 位置 | 顯示於 |
| --- | --- |
| `title` | 左上 |
| `subtitle` | 右上 |
| `summary` | 左下 |
| `aside` | 右下 |
| `image` | 左側 48×48 的縮圖（經由 `imageSrc` 轉換） |

- 格式化方式依欄位型別而定，與詳細頁相同（`formatColumnValue`）：日期依日期格式顯示，`ref` 欄位顯示對方的名稱
- 需要合併多個欄位，或顯示父列、子列的資訊時，應宣告為 schema 的 `virtualColumns`，不在頁面中組合字串
- 實作位於 `schema/view.ts`。這組位置名稱亦適用於日後的 profile、card、gallery（card 使用 `defineCardView`，見 ROADMAP 的「頁面類型」）
- 🔲 view 的 `actions` 尚未於本元件中呈現（規劃見 [actions.md](../actions.md#列上的動作)）

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，要顯示的那一列 |
| `view` | `RowView<Row>` | **必填**，`defineView` 的回傳值 |
| `to` | `string?` | 有給才是連結；沒給就是純顯示的一列 |
| `selectable` | `boolean?` | 預設 `false`。開了才綁長按監聽、才會禁止文字選取與拖曳 |
| `selectMode` | `boolean?` | 目前在不在多選模式 |
| `selected` | `boolean?` | 這一列有沒有被選 |

## Emits

| event | 說明 |
| --- | --- |
| `longpress` | 長按觸發，只有 `selectable` 時會發 |
| `toggle` | 多選模式下點擊觸發；此時不會導覽 |

## 備註

- **`to` 渲染成自己組 href 的 `<a>`，不是 `RouterLink`**：`RouterLink` 內部有一個讀 `currentRoute` 的 computed，列表有幾列就有幾個，每次導覽都會全部重算，而這個元件是給上千列的列表用的。點擊走 `router.push`；帶修飾鍵或非左鍵時交給瀏覽器，所以中鍵開新分頁是原生行為。代價是沒有 `router-link-active` 那組 class（列表用不到）
- **`content-visibility: auto`**：畫面外的列不排版也不繪製。`contain-intrinsic-size: auto 72px` 是它還沒量到真實高度前的替代值，列的版型若改動很多，這個數字要跟著調——差太多會讓捲動軸長度估錯、快速拖曳時跳動
