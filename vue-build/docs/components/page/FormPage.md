# FormPage

新增頁與編輯頁的整頁版型，包含五種狀態：載入中、載入失敗、找不到資料、表單本體、送出失敗。表單欄位本身由 `DataForm` 呈現，此元件只負責外圍。

此元件搭配 `useCreateForm` 或 `useEditForm` 使用，兩者的回傳值直接對應此處的 prop。
- **新增頁沒有載入階段**，省略 `loading` 與 `load-error` 即可
- 取消與送出兩個按鈕無須處理。上述兩個 composable 會自行將按鈕掛至底部動作列

## Usage

範本見 `template/pages/new.vue`（新增）與 `template/pages/edit.vue`（編輯）。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `object \| null` | **必填**，表單的列。`null` 時顯示「找不到這筆資料」 |
| `schema` | `TableSchema` | **必填**，決定欄位、順序與輸入元件 |
| `order` | `string[]?` | 這一頁的欄位順序，覆寫 schema 的 `formOrder`，例如新增頁與編輯頁須顯示不同的欄位時。此元件不帶 Row 型別，須檢查 key 時，於頁面標示為 `RowKey<XxxRow>[]` |
| `lockId` | `boolean?` | 主鍵欄是否唯讀。省略時自動判斷：已有 `id`（編輯頁）時唯讀，否則可填寫。新增頁的主鍵只能由預設值帶入時，傳入 `true` |
| `errors` | `Record<string, string>?` | 各欄的錯誤訊息（`fieldErrors`） |
| `loading` | `boolean?` | 編輯頁載入那一列的期間 |
| `loadError` | `string \| null?` | 載入失敗的訊息 |
| `error` | `string \| null?` | 送出失敗的訊息，顯示於表單下方 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ row }` | 表單下方額外放置的內容，例如說明、預覽。一般不使用，只放這張表專屬的內容 |

## 備註

- **狀態的優先順序**為 loading → loadError → 找不到資料 → 表單。前三種狀態由 [PageState](PageState.md) 顯示
- 「找不到這筆資料」使用 `warning`，不使用 `error`
- 欄位的錯誤訊息由 `DataForm` 顯示於各欄下方。此處的 `error` 屬於整張表單，例如送出失敗、後端錯誤
- **列已有 `id` 時（編輯頁），主鍵欄唯讀**。新增頁的 `id` 為空，可填寫，或留空由 `newId` 發號（見 [schema.md](../../topics/schema.md#主鍵)）
