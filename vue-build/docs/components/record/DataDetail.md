# DataDetail

detail 頁的欄位區：一列一欄，照 `order` 排，省略時照 schema 的 `detailOrder`；欄位的 `showIf` 回傳 `false` 時不顯示該欄（見 [schema.md](../../topics/schema.md#欄位呈現與其順序)）。**載入中／載入失敗／找不到資料由 [PageState](../page/PageState.md) 處理**（`DetailPage` 已經包好），所以拿到的 `row` 一般都存在。`type: 'ref'` 的欄位顯示對方的名字（對方 schema 的 `labelColumn`，沒設就是 id），對方那張表會自動載進共用快取。

欄位右邊的動作（ref 前往對方、開網址、改成今天）由 `fieldActions` 決定：欄位 key → `(row) => PageAction | null`（`null` 表示這一列不適用），一欄一個，整格都能點。從 `use表名Actions()` 拿現成的，見 [actions.md](../../topics/actions.md#欄位動作)；沒列的欄位就沒有按鈕，ref 的前往也要自己列。

schema 的 `virtualColumns`（見 [schema.md](../../topics/schema.md#欄位)）跟真實欄位一視同仁：自動顯示、可以排進 `detailOrder`。要多顯示什麼算出來的東西，就加成虛擬欄位，這個元件不收頁面塞進來的欄位。

## Usage

一般不直接用——詳細頁用 [DetailPage](../page/DetailPage.md)，它把狀態、上下筆、FAB 一起接好：

```vue
<template>
  <DataDetail :field-actions="fieldActions" :row="row" :schema="__table__Schema" />
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `schema` | `TableSchema` | **必填** |
| `row` | `Row \| null` | **必填**。`null` 時只顯示欄位名稱，值留白，亦無欄位的動作（dashboard 的詳細面板尚無選取時，由 `DetailPage` 使用） |
| `order` | `RowKey<Row>[]?` | 這一頁的欄位順序，覆寫 schema 的 `detailOrder`；沒列到的欄位不顯示 |
| `fieldActions` | `FieldActions<Row>?` | 欄位 key → `(row) => PageAction \| null`，每欄一個 |
| `editable` | `RowKey<Row>[]?` | 快速編輯的欄位，見下方「快速編輯」 |

## 快速編輯

`editable` 列出的欄位不顯示文字，而是直接以輸入元件（[InlineField](InlineField.md)）呈現，改了即以 `store.update` 寫入，不經過編輯頁。

- **只限真實欄位**：主鍵與虛擬欄位列了也照常顯示為文字
- **何時寫入**：打字類的欄位在焦點離開或按 Enter 時，其餘一改就寫入；驗證不通過時不寫入，錯誤顯示於欄位下方（細節見 [InlineField](InlineField.md)）
- **與欄位動作並存**：同一欄有 `fieldActions` 時，動作的圖示接在輸入元件右邊
- **換到另一筆時重新建立**：未寫入的值先寫回原本那一筆
- `row` 為 `null` 時不建立輸入元件
