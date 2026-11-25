# ListPage

列表頁的整頁版型：載入狀態、逐列顯示、右下角的 FAB，並於點擊一列時發布畫面上的順序。詳細頁的上一列、下一列依此順序切換。每一列以哪一種版面顯示、顯示哪些欄位，由頁面以 `item` 與 `view` 指定。

此元件搭配 `useListPage(table)` 使用：
- `table` 為表的 key，Row 的型別由 key 推出
- `useListPage` 依序處理：整張表 → `match` 與 `scope` → 頁面的排序 → 篩選 → 搜尋，並提供長按多選
- 回傳的 `rows`、`loading`、`error`、`selection` 直接對應此元件的 prop
- 選用的 `match`（`() => 物件`）為欄位 key 與值，只保留各欄等於該值的列，例如頁籤的狀態：
  - 值為 `undefined` 的鍵不篩選。選填的 prop 因此可直接傳入，未傳入時即沒有這個條件。`boolean` 的 prop 須以 `undefined` 為預設值，未指定預設值時 Vue 以 `false` 代入
  - 值為 `null` 時只保留該欄空白的列
  - 比較為嚴格相等，與篩選相同，`boolean` 的空白不等於否。日期比較時間值
  - 虛擬欄位也可篩選
  - 回傳的 `match` 已略過值為 `undefined` 的鍵，與 `selection` 一同作為 `list` 交給動作（見 [actions.md](../../topics/actions.md#各表的-use表名actions)）。新增時，其中的真實欄位即為預設值
- 選用的 `scope`（`row => boolean`）用於 `match` 寫不出的條件，例如日期的範圍。`match`、`scope` 與儀表板面板的 `scope`（例如依所選的父列篩出子列）位於同一步，皆須符合
- 選用的 `ignoreFilter`（欄位 key 的陣列）指定不套用至 `rows` 的條件，抽屜中仍顯示這些條件。圖表以此忽略分組欄與系列欄（見 [chart.md](../../topics/chart.md#分組欄與系列欄上的條件)）
- 選用的 `defaultSort`（格式與 schema 的 `defaultSort` 相同）為這個列表的預設排序。順序為排序面板的一欄、頁面的 `defaultSort`、schema 的 `defaultSort`。省略時只依 schema 的 `defaultSort`。頁籤頁與儀表板中，同一張表的各個列表可以各有不同的 `defaultSort`（見 [search.md](../../topics/search.md#排序)）

**搜尋與排序來自 `useListPage`，不來自此元件**：
- `useListPage` 內部呼叫 `useListControls`，因此使用它時，App Bar 即出現放大鏡。表在 `searchable` 中有可篩選的欄位時出現篩選按鈕，在 `sortable` 中有可排序的欄位時出現排序按鈕
- 位於 `TabPage` 之內時，`useListPage` 改為加入 `TabPage` 的共用控制，不自行登記
- 不需要搜尋，或同一頁面須手動登記多張表時，傳入 `{ search: false }`，見下方「手動登記多張表」

**使用者選了排序時不分組**，見下方「分組與頁籤」。

## Usage

範本見 `template/pages/list.vue`。以其他版面呈現時，見同資料夾的 `profile-list.vue`、`card-list.vue`、`gallery-list.vue`。依狀態分頁籤時，見 `tab-list.vue`。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填**，發布列表順序時使用 |
| `rows` | `Row[]` | **必填**，已篩選、搜尋與排序的列 |
| `loading` | `boolean?` | 載入中，顯示長條進度列 |
| `error` | `string \| null?` | 載入失敗的訊息 |
| `selection` | `MultiSelect?` | 提供時才綁定長按多選，即 `useListPage` 的 `selection` |
| `fab` | `(PageAction \| null)[]?` | 右下角的 FAB，通常為新增。`null` 略過 |
| `appBar` | `(PageAction \| null)[]?` | App Bar 右側的動作，通常為對選取的列的動作。`null` 略過。沒有提供時不登記 |
| `item` | `'list' \| 'profile' \| 'gallery' \| 'card'` | 每一列的版面，`'list'` 為 deck。提供 `view` 時**必填**，以 slot 呈現時可省略。各列的排法隨之決定：`'gallery'` 為格狀排列，其他依序往下排列（見 [ListLayout](../list/ListLayout.md)） |
| `view` | `RowView<Row>?` 或 `CardView<Row>?` | 每個位置顯示的欄位。`item` 為 `'card'` 時使用 `defineCardView` 的結果，其他使用 `defineView` 的結果。兩者不符時型別檢查報錯，開發模式下另以 console 警告 |
| `rowTo` | `((row: Row) => string)?` | 每一列的連結。省略時為純顯示的一列 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ row, props }` | 自訂每一列，取代 `view` 與 `rowTo`。`item` 只決定各列的排法，省略時依序往下排列。`props` 為多選須綁定的屬性：`selectable`、`selectMode`、`selected` 與長按、點選的事件。以 `v-bind` 綁定至 `DataList`、`DataProfile`、`DataCard` 或 `DataGallery` 即可。位於開啟 `selects` 的 dashboard 面板中時，另含 `current`、`pickable`、`pick`，點擊改為選取。兩者皆無時為空物件 |
| `rows` | `{ rows }` | 一次提供全部的列，用於表格式列表。提供此 slot 時不使用 `default`，也沒有多選的綁定，`DataTable` 本身不支援多選 |

### 表格式

```vue
<ListPage :error="error" :fab="[newAction]" :loading="loading" :rows="rows" table="__table__">
  <template #rows="{ rows: list }">
    <DataTable :columns="['name', 'amount']" :row-to="(row) => `/__table__/${row.id}`" :rows="list" table="__table__" />
  </template>
</ListPage>
```

卡片適合瀏覽，表格適合比對欄位。兩者的載入狀態、FAB、列表順序皆由此元件處理。分組只支援卡片。

## 分組與頁籤

分組以 `useListPage` 的選項 `levels` 指定，由外到內排列。每一層的寫法見 [GroupedList](../list/GroupedList.md)：

```ts
const { rows, loading, error, selection, match } = useListPage('__table__', {
  levels: [
    { sortKey: row => row.date?.getFullYear() ?? 0, label: row => row.date ? `${row.date.getFullYear()}年` : '未知' },
  ],
})
```

- `levels` 可為陣列、ref 或 getter。值為 `undefined` 時不分組
- `useListPage` 將 `levels` 與使用者選的排序交給同一張表的 `ListPage`，頁面無須另外傳入。同一個元件中，同一張表以最後一次呼叫的 `useListPage` 為準
- **使用者選了排序時不分組**，依 `rows` 的順序平鋪
- **列表的最上方有一條全展開列**（[ExpandAllRow](../list/ExpandAllRow.md)），文字為「全部」與列數。展開時依分組的順序平鋪全部的列，收合時回到分組
  - 沒有分組、使用者選了排序、沒有列，或最外層只有一組時不顯示。最外層只有一組時一律分組
  - 使用者選了排序再清除，或只剩一組後又有兩組以上時，恢復先前的狀態
- 判斷的邏輯為 `schema/group.ts` 的 `arrangeRows`
- 沒有 `useListPage` 的 `ListPage` 不分組，例如展開頁。表格式（`#rows`）也不分組

**頁籤**：
- 將列表拆成只供引用的元件（`_ref/`），每個頁籤放一個，各自以 `useListPage` 的 `match` 只保留該頁籤的列
- 搜尋、篩選與排序由 `TabPage` 統一登記，並跨頁籤共用（見 [search.md](../../topics/search.md#同一頁面中的多張表)）。範本為 `template/pages/tab-list.vue` 與 `template/pages/_ref/list.vue`
- 每個頁籤各有一個 `ListPage`，各自計算 FAB、多選與列表順序。FAB 只有目前頁籤的那一份生效，依 `TabPanel` 的訊號判斷。列表順序由被點擊的那個頁籤發布
- 發布的順序與畫面上的先後一致，分組時為分組由上往下的順序

## 手動登記多張表

同一頁面有多張表的列表、但不使用 `TabPage` 時：
- 各表的 `useListPage` 傳入 `{ search: false }`，關閉自動登記
- 頁面以 `useListControls` 登記一次，`tables` 列出多個元素
- 搜尋字串為全頁共用的一條。頁面須建立一個 ref 並傳入每張表。未傳入時，各表各自建立一條，只有登記的那張表可被搜尋

```ts
const query = ref('')
const parents = useListPage('parent', { search: false, query })
const children = useListPage('child', { search: false, query })

useListControls(query, {
  tables: [
    { table: 'parent', filters: parents.filters, rows: parents.allRows, sort: parents.sort },
    { table: 'child', filters: children.filters, rows: children.allRows, sort: children.sort },
  ],
  current: selectedTable,
})
```

- **每張表各有一份 `Filters`，同時生效**：各列表以各自的那一份交給 `useFilter`。切換表時，條件不會互相帶入
- **`current` 為頁面目前所在的表**，值與 `tableLabel` 相符。抽屜開啟時先停在該表，使用者仍可自行切換
- 傳入 `{ search: false }` 的列表，即使位於 `TabPage` 之內，也不加入其共用控制

## 各種版面

每一列的版面由 `item` 決定：

| `item` | 元件 | view |
| --- | --- | --- |
| `'list'`（deck） | [DataList](../list/DataList.md) | `defineView` |
| `'profile'` | [DataProfile](../list/DataProfile.md) | `defineView` |
| `'gallery'` | [DataGallery](../list/DataGallery.md) | `defineView` |
| `'card'` | [DataCard](../list/DataCard.md) | `defineCardView` |

- 版面不在其中時，以 default slot 自訂每一列
- 表格經由 `#rows` 使用 [DataTable](../list/DataTable.md)

哪個欄位放在哪個位置，由頁面定義的 view 指定（見 [DataList](../list/DataList.md#view)）。同一個 view 可交給 deck、profile 或 gallery，換版面時無須改寫欄位的對應。各版面的外觀與適用情況見 [design/list.md](../../design/list.md)。

- **gallery 為格狀排列**，其餘版面依序往下排列（見 [ListLayout](../list/ListLayout.md)）。分組時每一組各自排列，分組列一律佔一整行
- **table 經由 `#rows` slot**，全部的列交給 `DataTable`。表格不支援多選，須多選操作時改用其他版面
- **deck、profile、card、gallery 皆支援長按多選**，提供 `selection` 即可。自訂每一列時，以 `v-bind` 綁定 slot 提供的 `props`。多選模式下，各版面的動作皆隱藏
- **排序與分組與版面無關**：順序來自 `useListPage`（`defaultSort` 或使用者選的排序）與 `levels`，各版面皆依同一個順序呈現。gallery 由左往右、再由上往下排列
- **間距、陰影與點擊、選取的樣式為各版面共用**，定義於 `src/styles/list.css`（見 [ListLayout](../list/ListLayout.md) 的「共用的樣式」）
- 範本見 `template/pages/` 中的 `list.vue`（deck）、`profile-list.vue`、`card-list.vue`、`gallery-list.vue`

## 備註

- **版面確實不同時，才自行組合**：總覽頁那類混合的版面不使用此元件，資料層仍可使用 `useListPage`。此時頁面須自行呼叫 `provideListOrder(table, computed(() => 畫面上的順序))`（見 [RecordNav](../record/RecordNav.md)）
- **位於 [ChildList](ChildList.md) 中時，以子表區塊呈現**：只顯示前幾列，`fab` 為區塊的按鈕。其他的差異見 [ChildList.md](ChildList.md#展開頁於區塊中的差異)
- 空列表即顯示為空，不顯示「找不到資料」（見 [PageState](PageState.md)）
- **位於 dashboard 的面板中時，自動輸出列出的列與選取的列**（見 [DashboardPage](../panel/DashboardPage.md#面板的輸出)）。頁籤中的列表只在目前的頁籤時輸出，載入中不輸出。不使用此元件的自訂列表沒有輸出
- **內容區不留白**，由內容決定：list 式的列與分組列貼齊外緣，卡片四周留白（見 [ListLayout](../list/ListLayout.md) 的「留白」）。`#rows` 的表格四周留白
- **畫面寬時，內容區有最大寬度並置中**，沿用 `v-container` 的設定。數值見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」
