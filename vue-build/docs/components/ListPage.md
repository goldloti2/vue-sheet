# ListPage

列表頁的整頁版型：載入狀態、逐列渲染、右下角 FAB，外加把畫面上的順序發布出去（detail 頁的上／下一筆靠它）。每一列長什麼樣還是頁面自己決定——那是這張表專屬的部分。

搭 `useListPage(table, schema)` 用：它負責整表 → 篩選 → 搜尋與長按多選，回傳的 `rows`／`loading`／`error`／`selection` 直接對應這裡的 prop。

## Usage

```vue
<script lang="ts" setup>
  const { rows, loading, error, selection } = useListPage<__Table__Row>('__table__', __table__Schema)

  const { new: newActions, bulkDelete } = use__Table__Actions({
    selectedIds: selection.selectedIds,
    onDone: selection.clear,
  })
  useAppBarActions(() => [...bulkDelete.value, ...selection.cancel.value])
</script>

<template>
  <ListPage
    :error="error"
    :fab="newActions"
    :loading="loading"
    :rows="rows"
    :selection="selection"
    table="__table__"
  >
    <template #default="{ row, props: itemProps }">
      <DataList
        v-bind="itemProps"
        :bottom-left="formatField(row, __table__Schema, 'amount')"
        :title="formatField(row, __table__Schema, 'name')"
        :to="`/__table__/${row.id}`"
      />
    </template>
  </ListPage>
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填**，發布列表順序用 |
| `rows` | `Row[]` | **必填**，已經篩選、搜尋過的那些＝畫面上的順序 |
| `loading` | `boolean?` | 載入中（長條進度列） |
| `error` | `string \| null?` | 載入失敗的訊息 |
| `selection` | `MultiSelect?` | 給了才綁長按多選（`useListPage` 的 `selection`） |
| `fab` | `PageAction[]?` | 右下角的 FAB，通常是新增 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ row, props }` | 每一列。`props` 是多選要綁的那一包（`selectable`／`selectMode`／`selected`／長按與點選事件），`v-bind` 到 `DataList` 上就好；沒給 `selection` 時是空物件 |

## 備註

- **版面不一樣就不要用這個元件**：分組（`GroupedList`）、頁籤分面板、表格式（`DataTable`）這些請直接在頁面裡組，資料層仍然用 `useListPage`——批次列表就是這樣（頁籤 + 年月分組）
- **那種頁面要自己發布順序**：`useListOrder(table, computed(() => 畫面上的順序))`，因為只有頁面知道分組與頁籤之後實際的排列
- 空列表就是空的，不會顯示「找不到資料」——那是單筆頁面的狀態（見 [PageState](PageState.md)）
