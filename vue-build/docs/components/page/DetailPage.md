# DetailPage

詳細頁的整頁版型：載入狀態、選用的標頭區塊、欄位區、左右滑動換上下一筆、底部的上下筆箭頭、右下角 FAB，一次接好。頁面只要說「這是哪張表、哪一筆、有哪些動作」。

搭配 `useRecordPage(table)` 使用，其回傳的 `id`／`row`／`loading`／`error` 直接對應此處的 prop；`row` 另外交給 `useRowAction`，將 `use表名Actions` 中以列為參數的動作（編輯、刪除）綁定至這一筆（見 [actions.md](../../actions.md#各表的-use表名actions)）。

## Usage

範本見 `template/pages/detail.vue`。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填**，上下一筆的順序與導覽都靠它 |
| `id` | `string` | **必填**，網址上的那一筆（dashboard 中為互動選取的那一筆，尚無選取時為空字串） |
| `schema` | `TableSchema` | **必填**，決定顯示哪些欄位、順序 |
| `row` | `Row \| null` | **必填**，`null` 時顯示「找不到這筆資料」；dashboard 中 `id` 為空字串時改為只顯示欄位名稱，標頭與兩個 slot 皆不渲染 |
| `loading` | `boolean?` | 載入中 |
| `error` | `string \| null?` | 載入失敗的訊息 |
| `fieldActions` | `FieldActions<Row>?` | 欄位 key → 動作，每欄一個、整格可點 |
| `fab` | `(PageAction \| null)[]?` | 右下角的 FAB，通常是編輯；`null` 略過 |
| `header` | `RowView<Row>?` | 選用，整頁最上方的標頭區塊（`defineView` 的回傳值），置於 `top` slot 之上，見 [DetailHeader](../record/DetailHeader.md) |

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
- **於 dashboard 的面板中**：兩者僅於面板展開時啟用，且改為換成互動選取的上下一筆，不離開 dashboard（見 [dashboard.md](../../dashboard.md)）
- 狀態階梯本身是 [PageState](PageState.md) 畫的；`DataDetail` 只管有資料時怎麼顯示欄位
