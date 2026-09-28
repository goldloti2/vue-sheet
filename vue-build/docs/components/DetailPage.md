# DetailPage

詳細頁的整頁版型：載入狀態、欄位區、左右滑動換上下一筆、底部的上下筆箭頭、右下角 FAB，一次接好。頁面只要說「這是哪張表、哪一筆、有哪些動作」。

搭 `useRecordPage(table)` 用，它回傳的 `id`／`row`／`loading`／`error` 直接對應這裡的 prop；`row` 另外餵給 `use表名Actions({ row })`，動作才知道操作的是哪一筆。

## Usage

```vue
<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import DetailPage from '@/components/ui/page/DetailPage.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useRecordPage } from '@/composables/page/useRecordPage'
  import { useAppBarActions } from '@/composables/shell/useAppBarActions'
  import { __table__Schema } from '@/schema/__table__'

  const { id, row, loading, error } = useRecordPage<__Table__Row>('__table__')

  const { delete: deleteActions, edit: editActions, fieldActions } = use__Table__Actions({ row })
  useAppBarActions(() => deleteActions.value)
</script>

<template>
  <DetailPage
    :id="id"
    :error="error"
    :fab="editActions"
    :field-actions="fieldActions"
    :loading="loading"
    :row="row"
    :schema="__table__Schema"
    table="__table__"
  />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填**，上下一筆的順序與導覽都靠它 |
| `id` | `string` | **必填**，網址上的那一筆 |
| `schema` | `TableSchema` | **必填**，決定顯示哪些欄位、順序 |
| `row` | `Row \| null` | **必填**，`null` 時顯示「找不到這筆資料」 |
| `loading` | `boolean?` | 載入中 |
| `error` | `string \| null?` | 載入失敗的訊息 |
| `fieldActions` | `FieldActions?` | 欄位 key → 動作，每欄一個、整格可點 |
| `fab` | `PageAction[]?` | 右下角的 FAB，通常是編輯 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ row }` | 欄位區**底下**額外要放的東西（子表、說明、圖表…）。資料到手才渲染，所以 `row` 不會是 `null`，型別也跟著 `:row` 走 |
| `top` | `{ row }` | 同上，但擺在欄位區**上面**。子表才是主體、欄位只是附註的頁面用 |

### 順序怎麼決定

- **欄位的順序**歸 schema 的 `detailOrder`
- **區塊的順序**歸頁面：放 `#top` 就在欄位上面、放 default 就在下面，同一個 slot 裡有好幾塊就照寫的順序
- **想插在某兩個欄位中間**：不支援，也刻意不做（`DetailPage` 得把欄位切段渲染、`DataDetail` 得能只畫部分欄位，為了罕見需求把兩個元件都變複雜）。真的需要就那一頁不用 `DetailPage`，照下面自己排——這個元件的 template 只有二十行，零件都是現成的：

  ```vue
  <PageState :empty="!row" :error="error" :loading="loading">
    <DataDetail :only="['total', 'status']" :row="row" :schema="schema" />
    <ChildList … />
    <DataDetail :only="['note1', 'note2']" :row="row" :schema="schema" />
  </PageState>
  ```

  （`DataDetail` 目前還沒有 `only`，`DataForm` 有；真的要用時照抄三行就好）

## 備註

- **子表這樣放**：slot 裡擺一個 [ChildList](ChildList.md)，`rows` 直接給父列上的 `$子表_欄位key` getter（不用另外查），它會處理標題與筆數、顯示上限、右下角的「展開」與新增
- **左右滑動與箭頭是同一份順序**（`useListOrder` 發布的列表順序）：沒有經過列表頁就直接開網址時，兩者都會安靜地沒有上下筆
- 狀態階梯本身是 [PageState](PageState.md) 畫的；`DataDetail` 只管有資料時怎麼顯示欄位
