# ListPage

列表頁的整頁版型：載入狀態、逐列渲染、右下角 FAB，外加把畫面上的順序發布出去（detail 頁的上／下一筆靠它）。每一列長什麼樣還是頁面自己決定——那是這張表專屬的部分。

搭 `useListPage(table, schema)` 用：它負責整表 → 篩選 → 搜尋與長按多選，回傳的 `rows`／`loading`／`error`／`selection` 直接對應這裡的 prop。

**搜尋是那個 composable 帶來的，不是這個元件**：`useListPage` 內部會呼叫 `useAppBarSearch`，所以用了它 App Bar 就有放大鏡與篩選鈕（欄位要標 `searchable`）。不想要、或一頁要接好幾張表時傳 `{ search: false }`，見 [ui.md](../ui.md#搜尋)。

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
| `rows` | `Row[]?` | 已經篩選、搜尋過的那些＝畫面上的順序。跟 `groups` 二選一 |
| `groups` | `RowGroup<Row>[]?` | 分組後的結果（`groupRows` 的回傳），內部改用 `GroupedList` 渲染 |
| `loading` | `boolean?` | 載入中（長條進度列） |
| `error` | `string \| null?` | 載入失敗的訊息 |
| `selection` | `MultiSelect?` | 給了才綁長按多選（`useListPage` 的 `selection`） |
| `fab` | `PageAction[]?` | 右下角的 FAB，通常是新增 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ row, props }` | 每一列。`props` 是多選要綁的那一包（`selectable`／`selectMode`／`selected`／長按與點選事件），`v-bind` 到 `DataList` 上就好；沒給 `selection` 時是空物件 |
| `rows` | `{ rows }` | 整批一次給，表格式列表用。有這個 slot 就不走 `default`，也沒有多選綁定（`DataTable` 本來就沒有多選） |

### 表格式

```vue
<ListPage :error="error" :fab="newActions" :loading="loading" :rows="rows" table="__table__">
  <template #rows="{ rows: list }">
    <DataTable :columns="['name', 'amount']" :row-to="(row) => `/__table__/${row.id}`" :rows="list" :schema="__table__Schema" />
  </template>
</ListPage>
```

卡片適合瀏覽、表格適合比對欄位，兩者的載入狀態、FAB、列表順序都一樣由這個元件處理。分組（`groups`）只支援卡片。

## 分組與頁籤

分組給 `groups`（`rows` 就不用給），列的 slot 寫法完全一樣：

```vue
<TabView v-model="selectedStatus" :tabs="statusTabs">
  <template #default="{ tab }">
    <ListPage :error="error" :fab="newActions" :groups="groupedFor(tab)" :loading="loading" :selection="selection" table="__table__">
      <template #default="{ row, props: itemProps }">
        <DataList v-bind="itemProps" :title="row.$label" :to="`/__table__/${row.id}`" />
      </template>
    </ListPage>
  </template>
</TabView>
```

**一個頁籤一個 `ListPage`**：每個面板各自算自己的狀態、FAB 與列表順序，只有當前面板那份會生效（靠 `TabViewPanel` 的訊號），所以頁面不用知道「現在是哪個頁籤」。發布順序時會先 `flattenGroups`，跟畫面上的先後一致。

## 備註

- **版面真的不一樣才自己組**：總覽頁那種混合版面用不到這個元件，資料層仍然可以用 `useListPage`；那時要自己 `useListOrder(table, computed(() => 畫面上的順序))`，因為只有頁面知道實際排列
- 空列表就是空的，不會顯示「找不到資料」——那是單筆頁面的狀態（見 [PageState](PageState.md)）
