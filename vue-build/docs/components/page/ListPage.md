# ListPage

列表頁的整頁版型：載入狀態、逐列渲染、右下角 FAB，外加把畫面上的順序發布出去（detail 頁的上／下一筆靠它）。每一列長什麼樣還是頁面自己決定——那是這張表專屬的部分。

搭配 `useListPage(table, schema)` 使用：其依序處理整表 → `scope` → 篩選 → 搜尋，並提供長按多選，回傳的 `rows`／`loading`／`error`／`selection` 直接對應本元件的 prop。選用的 `scope`（`row => boolean`）於篩選與搜尋之前只留部分的列，例如頁籤的狀態。

**搜尋與排序來自該 composable，而非本元件**：`useListPage` 內部呼叫 `useListControls`，因此使用它時 App Bar 即出現放大鏡、篩選鈕與排序鈕（欄位須列於 `searchable`／`sortable`）。位於 `TabPage` 之內時，改為加入 `TabPage` 的共用控制，不自行登記；不需要搜尋，或同一頁面須手動登記多張表時，傳入 `{ search: false }`，見下方「手動登記多張表」。

**選了排序就別再分組**：回傳的 `sort` 不是 null 時把 `groups` 換成 `rows`，見 [ui.md 的排序](../../ui.md#排序)。

## Usage

範本見 `template/pages/list.vue`；以其他版面呈現時見同資料夾的 `profile-list.vue`、`card-list.vue`、`gallery-list.vue`，依狀態分頁籤時見 `tab-list.vue`。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填**，發布列表順序用 |
| `rows` | `Row[]?` | 已經篩選、搜尋過的那些＝畫面上的順序。跟 `groups` 二選一 |
| `groups` | `RowGroup<Row>[]?` | 分組後的結果（`groupRows` 的回傳），內部改用 `GroupedList` 渲染 |
| `loading` | `boolean?` | 載入中（長條進度列） |
| `error` | `string \| null?` | 載入失敗的訊息 |
| `selection` | `MultiSelect?` | 給了才綁長按多選（`useListPage` 的 `selection`） |
| `fab` | `(PageAction \| null)[]?` | 右下角的 FAB，通常是新增；`null` 略過 |
| `layout` | `'list' \| 'grid'?` | 各筆的排法，預設 `'list'`（依序往下排）；gallery 用 `'grid'`（格狀排列）。分組時一併轉交給 `GroupedList`，見 [ListLayout](../list/ListLayout.md) |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ row, props }` | 每一列。`props` 是多選要綁的那一包（`selectable`／`selectMode`／`selected`／長按與點選事件），`v-bind` 到 `DataList`、`DataProfile`、`DataCard` 或 `DataGallery` 上就好；位於開啟互動的 dashboard 中時另含 `current`／`pickable`／`pick`（點擊改為選取）。兩者皆無時是空物件 |
| `rows` | `{ rows }` | 整批一次給，表格式列表用。有這個 slot 就不走 `default`，也沒有多選綁定（`DataTable` 本來就沒有多選） |

### 表格式

```vue
<ListPage :error="error" :fab="[newAction]" :loading="loading" :rows="rows" table="__table__">
  <template #rows="{ rows: list }">
    <DataTable :columns="['name', 'amount']" :row-to="(row) => `/__table__/${row.id}`" :rows="list" :schema="__table__Schema" />
  </template>
</ListPage>
```

卡片適合瀏覽、表格適合比對欄位，兩者的載入狀態、FAB、列表順序都一樣由這個元件處理。分組（`groups`）只支援卡片。

## 分組與頁籤

分組時給 `groups`（不給 `rows`），列的 slot 寫法相同；使用者選了排序時改給 `rows`：

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

**頁籤**：將列表拆成只供引用的元件（`_ref/`），每個頁籤放一個，各自以 `useListPage` 的 `scope` 只留該頁籤的列；搜尋、篩選與排序由 `TabPage` 統一登記並跨頁籤共用（見 [ui.md](../../ui.md#同一頁面中的多張表)，範本為 `template/pages/tab-list.vue` 與 `template/pages/_ref/list.vue`）。每個頁籤各有一個 `ListPage`，各自計算 FAB、多選與列表順序，只有當前頁籤那份會生效（靠 `TabPanel` 的訊號）。發布順序時會先 `flattenGroups`，與畫面上的先後一致。

## 手動登記多張表

不使用 `TabPage` 而同一頁面有多張表的列表時，各表的 `useListPage` 傳入 `{ search: false }` 以關閉自動登記，改由頁面以 `useListControls` 登記一次，`tables` 列出多個元素。搜尋字串為全頁共用的一條，須由頁面建立一個 ref 並傳入每張表（未傳入時各表會各自建立一條，僅登記的那一張可被搜尋）：

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

- **每張表各有一份 `Filters`，同時生效**：各列表以各自的那一份交給 `useFilter`，切換表時條件不會互相帶入
- **`current` 為頁面目前所在的表**（值與 `tableLabel` 相符），抽屜開啟時先停在該表，使用者仍可自行切換
- 傳入 `{ search: false }` 的列表，即使位於 `TabPage` 之內，亦不加入其共用控制

## 備註

- **版面真的不一樣才自己組**：總覽頁那種混合版面用不到這個元件，資料層仍然可以用 `useListPage`；那時要自己 `useListOrder(table, computed(() => 畫面上的順序))`，因為只有頁面知道實際排列
- 空列表就是空的，不會顯示「找不到資料」——那是單筆頁面的狀態（見 [PageState](PageState.md)）
- **內容區為不具名的 container**（`container-type: inline-size`）：列表元件以 `cqw` 依寬度估計畫面外各列的高度（見 [DataCard](../list/DataCard.md) 的備註）。不具名，不影響 dashboard 以 `@container dashboard-panel` 判斷的窄版
