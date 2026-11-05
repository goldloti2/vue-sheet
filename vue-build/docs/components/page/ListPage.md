# ListPage

列表頁的整頁版型：載入狀態、逐列顯示、右下角的 FAB，並於點擊一列時發布畫面上的順序。詳細頁的上一列、下一列依此順序切換。每一列的外觀由頁面決定。

此元件搭配 `useListPage(table, schema)` 使用：
- `useListPage` 依序處理：整張表 → `scope` → 篩選 → 搜尋，並提供長按多選
- 回傳的 `rows`、`loading`、`error`、`selection` 直接對應此元件的 prop
- 選用的 `scope`（`row => boolean`）在篩選與搜尋之前只保留部分的列，例如頁籤的狀態。儀表板面板的 `scope`（例如依所選的父列篩出子列）也位於這一步
- 選用的 `ignoreFilter`（欄位 key 的陣列）指定不套用至 `rows` 的條件，抽屜中仍顯示這些條件。圖表以此忽略分組欄與系列欄（見 [chart.md](../../topics/chart.md#分組欄與系列欄上的條件)）

**搜尋與排序來自 `useListPage`，不來自此元件**：
- `useListPage` 內部呼叫 `useListControls`，因此使用它時，App Bar 即出現放大鏡。表在 `searchable` 中有可篩選的欄位時出現篩選按鈕，在 `sortable` 中有可排序的欄位時出現排序按鈕
- 位於 `TabPage` 之內時，`useListPage` 改為加入 `TabPage` 的共用控制，不自行登記
- 不需要搜尋，或同一頁面須手動登記多張表時，傳入 `{ search: false }`，見下方「手動登記多張表」

**使用者選了排序時不分組**：回傳的 `sort` 不是 null 時，以 `rows` 取代 `groups`，見 [search.md 的排序](../../topics/search.md#排序)。

## Usage

範本見 `template/pages/list.vue`。以其他版面呈現時，見同資料夾的 `profile-list.vue`、`card-list.vue`、`gallery-list.vue`。依狀態分頁籤時，見 `tab-list.vue`。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填**，發布列表順序時使用 |
| `rows` | `Row[]?` | 已篩選、搜尋過的列，即畫面上的順序。與 `groups` 擇一提供 |
| `groups` | `RowGroup<Row>[]?` | 分組後的結果（`groupRows` 的回傳值），元件內部改以 `GroupedList` 顯示 |
| `loading` | `boolean?` | 載入中，顯示長條進度列 |
| `error` | `string \| null?` | 載入失敗的訊息 |
| `selection` | `MultiSelect?` | 提供時才綁定長按多選，即 `useListPage` 的 `selection` |
| `fab` | `(PageAction \| null)[]?` | 右下角的 FAB，通常為新增。`null` 略過 |
| `layout` | `'list' \| 'grid'?` | 各列的排法，預設 `'list'`（依序往下排列）。gallery 使用 `'grid'`（格狀排列）。分組時一併轉交給 `GroupedList`，見 [ListLayout](../list/ListLayout.md) |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ row, props }` | 每一列。`props` 為多選須綁定的屬性：`selectable`、`selectMode`、`selected` 與長按、點選的事件。以 `v-bind` 綁定至 `DataList`、`DataProfile`、`DataCard` 或 `DataGallery` 即可。位於開啟 `selects` 的 dashboard 面板中時，另含 `current`、`pickable`、`pick`，點擊改為選取。兩者皆無時為空物件 |
| `rows` | `{ rows }` | 一次提供全部的列，用於表格式列表。提供此 slot 時不使用 `default`，也沒有多選的綁定，`DataTable` 本身不支援多選 |

### 表格式

```vue
<ListPage :error="error" :fab="[newAction]" :loading="loading" :rows="rows" table="__table__">
  <template #rows="{ rows: list }">
    <DataTable :columns="['name', 'amount']" :row-to="(row) => `/__table__/${row.id}`" :rows="list" :schema="__table__Schema" />
  </template>
</ListPage>
```

卡片適合瀏覽，表格適合比對欄位。兩者的載入狀態、FAB、列表順序皆由此元件處理。分組（`groups`）只支援卡片。

## 分組與頁籤

分組時提供 `groups`，不提供 `rows`，列的 slot 寫法相同。使用者選了排序時，改為提供 `rows`：

```ts
const groups = computed(() => sort.value ? undefined : groupRows(rows.value, groupLevels))
```

```vue
<ListPage :error="error" :fab="[newAction]" :groups="groups" :loading="loading" :rows="groups ? undefined : rows" :selection="selection" table="__table__">
  <template #default="{ row, props: itemProps }">
    <DataList v-bind="itemProps" :row="row" :to="`/__table__/${row.id}`" :view="view" />
  </template>
</ListPage>
```

**頁籤**：
- 將列表拆成只供引用的元件（`_ref/`），每個頁籤放一個，各自以 `useListPage` 的 `scope` 只保留該頁籤的列
- 搜尋、篩選與排序由 `TabPage` 統一登記，並跨頁籤共用（見 [search.md](../../topics/search.md#同一頁面中的多張表)）。範本為 `template/pages/tab-list.vue` 與 `template/pages/_ref/list.vue`
- 每個頁籤各有一個 `ListPage`，各自計算 FAB、多選與列表順序。FAB 只有目前頁籤的那一份生效，依 `TabPanel` 的訊號判斷。列表順序由被點擊的那個頁籤發布
- 發布順序前先執行 `flattenGroups`，順序與畫面上的先後一致

## 手動登記多張表

同一頁面有多張表的列表、但不使用 `TabPage` 時：
- 各表的 `useListPage` 傳入 `{ search: false }`，關閉自動登記
- 頁面以 `useListControls` 登記一次，`tables` 列出多個元素
- 搜尋字串為全頁共用的一條。頁面須建立一個 ref 並傳入每張表。未傳入時，各表各自建立一條，只有登記的那張表可被搜尋

```ts
const query = ref('')
const parents = useListPage<ParentRow>('parent', parentSchema, { search: false, query })
const children = useListPage<ChildRow>('child', childSchema, { search: false, query })

useListControls(query, {
  tables: [
    { schema: parentSchema, filters: parents.filters, rows: parents.allRows, sort: parents.sort },
    { schema: childSchema, filters: children.filters, rows: children.allRows, sort: children.sort },
  ],
  current: selectedTable,
})
```

- **每張表各有一份 `Filters`，同時生效**：各列表以各自的那一份交給 `useFilter`。切換表時，條件不會互相帶入
- **`current` 為頁面目前所在的表**，值與 `tableLabel` 相符。抽屜開啟時先停在該表，使用者仍可自行切換
- 傳入 `{ search: false }` 的列表，即使位於 `TabPage` 之內，也不加入其共用控制

## 各種版面

每一列的呈現方式由置於 default slot 的元件決定：
- deck 為 [DataList](../list/DataList.md)，另有 [DataProfile](../list/DataProfile.md)、[DataCard](../list/DataCard.md)、[DataGallery](../list/DataGallery.md)
- 表格經由 `#rows` 使用 [DataTable](../list/DataTable.md)

哪個欄位放在哪個位置，由頁面定義的 view 指定（`defineView`，card 為 `defineCardView`，見 [DataList](../list/DataList.md#view)）。同一個 view 可交給 deck、profile 或 gallery，換版面時無須改寫欄位的對應。各版面的外觀與適用情況見 [design/list.md](../../design/list.md)。

- **gallery 須搭配 `layout="grid"`**，其餘版面維持預設的 `list`（見 [ListLayout](../list/ListLayout.md)）。分組時每一組各自排列，組的標題一律佔一整行
- **table 經由 `#rows` slot**，全部的列交給 `DataTable`。表格不支援多選，須多選操作時改用其他版面
- **deck、profile、card、gallery 皆支援長按多選**，接法相同：以 `v-bind` 綁定 slot 提供的 `props`。多選模式下，各版面的動作皆隱藏
- **排序與分組與版面無關**：順序來自 `useListPage`（`defaultSort` 或使用者選的排序）與 `groupRows`，各版面皆依同一個順序呈現。gallery 由左往右、再由上往下排列
- **間距、陰影與點擊、選取的樣式為各版面共用**，定義於 `src/styles/list.css`（見 [ListLayout](../list/ListLayout.md) 的「共用的樣式」）
- 範本見 `template/pages/` 中的 `list.vue`（deck）、`profile-list.vue`、`card-list.vue`、`gallery-list.vue`

## 備註

- **版面確實不同時，才自行組合**：總覽頁那類混合的版面不使用此元件，資料層仍可使用 `useListPage`。此時頁面須自行呼叫 `provideListOrder(table, computed(() => 畫面上的順序))`（見 [RecordNav](../record/RecordNav.md)）
- 空列表即顯示為空，不顯示「找不到資料」（見 [PageState](PageState.md)）
- **位於 dashboard 的面板中時，自動輸出列出的列與選取的列**（見 [DashboardPage](../panel/DashboardPage.md#面板的輸出)）。頁籤中的列表只在目前的頁籤時輸出，載入中不輸出。不使用此元件的自訂列表沒有輸出
- **內容區不留白**，由內容決定：list 式的列與組的標題貼齊外緣，卡片四周留白（見 [ListLayout](../list/ListLayout.md) 的「留白」）。`#rows` 的表格四周留白
- **畫面寬時，內容區有最大寬度並置中**，沿用 `v-container` 的設定。數值見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」
