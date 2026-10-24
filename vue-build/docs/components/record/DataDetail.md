# DataDetail

詳細頁的欄位區：一列一個欄位，依 `order` 排列，省略時依 schema 的 `detailOrder`。欄位的 `showIf` 回傳 `false` 時，不顯示該欄（見 [schema.md](../../topics/schema.md#欄位呈現與其順序)）。

- **載入中、載入失敗、找不到資料由 [PageState](../page/PageState.md) 處理**，`DetailPage` 已包好。因此此元件取得的 `row` 一般都存在
- `type: 'ref'` 的欄位顯示父列的名稱，即父表 schema 的 `labelColumn`，未設定時為 id。父表自動載入共用快取

欄位右側的動作（前往 ref 的父列、開啟網址、改成今天）由 `fieldActions` 決定：
- 格式為欄位 key → `(row) => PageAction | null`。`null` 表示這一列不適用
- 每一欄一個動作，整格可點擊
- 現成的動作從 `use表名Actions()` 取得，見 [actions.md](../../topics/actions.md#欄位動作)
- 未列出的欄位沒有按鈕。前往 ref 父列的動作也須自行列出

schema 的 `virtualColumns`（見 [schema.md](../../topics/schema.md#欄位)）與真實欄位一視同仁：自動顯示，可排進 `detailOrder`。要多顯示計算出的值時，新增虛擬欄位。此元件不接收頁面另外傳入的欄位。

## Usage

一般不直接使用此元件。詳細頁使用 [DetailPage](../page/DetailPage.md)，`DetailPage` 一併接好狀態、上一列與下一列、FAB：

```vue
<template>
  <DataDetail :field-actions="fieldActions" :row="row" :schema="__table__Schema" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `schema` | `TableSchema` | **必填** |
| `row` | `Row \| null` | **必填**。`null` 時只顯示欄位名稱，值留白，也沒有欄位的動作。dashboard 的詳細面板尚未選取時，由 `DetailPage` 使用 |
| `order` | `RowKey<Row>[]?` | 這一頁的欄位順序，覆寫 schema 的 `detailOrder`。未列出的欄位不顯示 |
| `fieldActions` | `FieldActions<Row>?` | 欄位 key → `(row) => PageAction \| null`，每一欄一個 |
| `editable` | `RowKey<Row>[]?` | 快速編輯的欄位，見下方「快速編輯」 |
| `layout` | `('side' \| 'stacked')?` | 欄位的排法：標籤與值左右並排，或上下兩行。省略時依 `config/app.ts` 的 `detailFieldLayout`（見 [DetailField](DetailField.md)） |

## 快速編輯

`editable` 列出的欄位不顯示文字，直接以輸入元件（[InlineField](InlineField.md)）呈現。修改後即以 `store.update` 寫入，不經過編輯頁。

- **只限真實欄位**：主鍵與虛擬欄位即使列出，仍顯示為文字
- **寫入的時機**：打字類的欄位在焦點離開或按 Enter 時寫入，其餘欄位一修改就寫入。驗證不通過時不寫入，錯誤顯示於欄位下方（細節見 [InlineField](InlineField.md)）
- **與欄位動作並存**：同一欄有 `fieldActions` 時，動作的圖示接在輸入元件右側
- **切換到另一列時重新建立**：未寫入的值先寫回原本那一列
- `row` 為 `null` 時，不建立輸入元件
