# DataProfile

profile 式列表的**單一張卡片**：左側為圓形頭像，中間上下排列主標題與副標題，右側以 ⋮ 選單收納該列的動作。與 [DataList](DataList.md) 不同，卡片之間有間隔，不連成一串；點擊卡片進入 detail，不支援長按多選。

與 DataList 相同，各欄位的位置由 view（`defineView`）指定，自身不做迴圈：列表頁放在 [ListPage](ListPage.md) 的 slot 裡，其他地方用 `v-for` 或包在 `GroupedList` 的 slot 裡。給了 `to` 整張卡片就是連結。

## Usage

```vue
<script lang="ts" setup>
  import DataProfile from '@/components/ui/list/DataProfile.vue'
  import ListPage from '@/components/ui/page/ListPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { __table__Schema } from '@/schema/tables/__table__'
  import { defineView } from '@/schema/view'

  const { edit, delete: remove } = use__Table__Actions()
  const view = defineView(__table__Schema, {
    title: 'name',
    subtitle: 'date',
    image: 'photo',
    actions: row => [edit(row), remove(row)],
  })
</script>

<template>
  <ListPage table="__table__" :rows="rows">
    <template #default="{ row }">
      <DataProfile :row="row" :to="`/__table__/${row.id}`" :view="view" />
    </template>
  </ListPage>
</template>
```

## 使用的位置

view 的定義方式見 [DataList](DataList.md#view)。本元件僅使用以下位置，其餘位置（`summary`、`aside`）即使指定亦不顯示：

| 位置 | 顯示於 |
| --- | --- |
| `title` | 中間上方，過長時以省略號截斷 |
| `subtitle` | 中間下方，過長時以省略號截斷 |
| `image` | 左側 40×40 的圓形頭像，圖片裁切填滿（`object-fit: cover`）；沒有圖片時不顯示，標題往左靠齊 |
| `actions` | 右側的 ⋮ 選單，由 [ViewActions](ViewActions.md) 的 `variant="menu"` 呈現。只有一個動作時亦收入選單；沒有動作時不顯示 ⋮ |

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，要顯示的那一列 |
| `view` | `RowView<Row>` | **必填**，`defineView` 的回傳值 |
| `to` | `string?` | 有給才是連結；沒給就是純顯示的一張卡片 |

## 備註

- **連結與 DataList 相同**：自行組 `href` 的 `<a>`，不使用 `RouterLink`，兩者共用 `useRowLink`（理由見 [DataList](DataList.md) 的備註）。⋮ 按鈕與連結並列，不包在 `<a>` 內，點擊 ⋮ 不會進入 detail
- **不支援多選**：不接收 `ListPage` slot 的 `props`，亦不綁長按監聽
- **間隔由元件自身負責**：卡片帶有下方間距、圓角與外框，`ListPage` 與 `GroupedList` 不需另外設定
- **`content-visibility: auto`**：畫面外的卡片不進行排版與繪製。`contain-intrinsic-size: auto 68px` 為尚未量得實際高度前的替代值；卡片的版型若大幅變動，此數值須一併調整
