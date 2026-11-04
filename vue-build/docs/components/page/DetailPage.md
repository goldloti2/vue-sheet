# DetailPage

詳細頁的整頁版型，一次接好：
- 載入狀態
- 選用的標頭區塊
- 欄位區
- 左右滑動切換上一列、下一列
- 底部的上一列、下一列箭頭
- 右下角的 FAB

頁面只須指定「哪張表、哪一列、有哪些動作」。

此元件搭配 `useRecordPage(table)` 使用，其回傳的 `id`、`row`、`loading`、`error` 直接對應此處的 prop。`row` 另交給 `useRowAction`，將 `use表名Actions` 中以列為參數的動作（編輯、刪除）綁定至這一列（見 [actions.md](../../topics/actions.md#各表的-use表名actions)）。

## Usage

範本見 `template/pages/detail.vue`。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填**，上一列、下一列的順序與導覽皆依此表 |
| `id` | `string` | **必填**，網址上的那一列。dashboard 中為面板的 `scope` 剛好一列時的那一列，否則為空字串 |
| `schema` | `TableSchema` | **必填**，決定顯示的欄位與順序 |
| `row` | `Row \| null` | **必填**，`null` 時顯示「找不到這一列」。dashboard 中 `id` 為空字串時，改為只顯示欄位名稱，標頭與兩個 slot 皆不顯示 |
| `loading` | `boolean?` | 載入中 |
| `error` | `string \| null?` | 載入失敗的訊息 |
| `order` | `RowKey<Row>[]?` | 這一頁的欄位順序，覆寫 schema 的 `detailOrder`（見 [DataDetail](../record/DataDetail.md)） |
| `fieldActions` | `FieldActions<Row>?` | 欄位 key → 動作，每一欄一個，整格可點擊 |
| `editable` | `RowKey<Row>[]?` | 快速編輯的欄位：直接顯示為輸入元件，修改後即寫入（見 [DataDetail](../record/DataDetail.md#快速編輯)） |
| `layout` | `('side' \| 'stacked')?` | 這一頁欄位的排法，覆寫 `config/app.ts` 的 `detailFieldLayout`（見 [DetailField](../record/DetailField.md)） |
| `fab` | `(PageAction \| null)[]?` | 右下角的 FAB，通常為編輯。`null` 略過 |
| `header` | `RowView<Row>?` | 選用，整頁最上方的標頭區塊（`defineView` 的回傳值），置於 `top` slot 之上，見 [DetailHeader](../record/DetailHeader.md) |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ row }` | 欄位區**下方**額外放置的內容，例如子表、說明、圖表。資料取得後才顯示，因此 `row` 不會是 `null`，型別隨 `:row` 而定 |
| `top` | `{ row }` | 欄位區**上方**額外放置的內容，其餘與 `default` 相同。用於子表為主體、欄位只是附註的頁面 |

### 順序的決定方式

- **欄位的順序**預設為 schema 的 `detailOrder`，這一頁可以 `order` 另外指定
- **區塊的順序**由頁面決定：置於 `#top` 的在欄位上方，置於 default 的在欄位下方。同一個 slot 中有多個區塊時，依撰寫的順序排列
- **插在兩個欄位之間**：不支援。須如此排列的頁面不使用 `DetailPage`，以現成的元件自行排列：

  ```vue
  <PageState :empty="!row" :error="error" :loading="loading">
    <DataDetail :order="['total', 'status']" :row="row" :schema="schema" />
    <ChildList … />
    <DataDetail :order="['note1', 'note2']" :row="row" :schema="schema" />
  </PageState>
  ```

## 備註

- **子表的放法**：slot 中放一個 [ChildList](ChildList.md)，`rows` 直接傳入父列上的 `$子表_欄位key` getter，無須另外查詢。`ChildList` 處理標題與列數、顯示上限、右下角的「展開」與新增
- **左右滑動與箭頭使用同一份順序**，即點擊一列時列表發布的順序（見 [RecordNav](../record/RecordNav.md)）。未經過列表頁、直接開啟網址時，兩者皆沒有上一列與下一列，也不顯示提示
- **於 dashboard 的面板中**：左右滑動與箭頭只在面板展開時啟用，並改為移動來源列表的選取，不離開 dashboard。`scope` 為推導出的值時停用（見 [DashboardPage](../panel/DashboardPage.md#詳細面板)）
- **位於 dashboard 的面板中時，自動輸出顯示的那一列為面板的 `shown`**。只顯示欄位名稱時輸出零列（見 [DashboardPage](../panel/DashboardPage.md#面板的輸出)）
- 載入狀態由 [PageState](PageState.md) 顯示。`DataDetail` 只負責有資料時的欄位顯示
