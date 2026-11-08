# FormLayerHost

繪製表單層的堆疊。`AppShell` 掛載一個實例，頁面不直接使用此元件。機制見 [pages.md](../../topics/pages.md#表單層)。

每一層依種類繪製：
- **FormLayer**：`openForm` 與 `runStep` 開啟的表單，大小與頁面相同。最上方為返回與標題，最底端為「取消」與送出
- **FieldsLayer**：`askFields` 開啟的對話框，內容為 [FieldsDialog](../dialog/FieldsDialog.md)

## openForm 的選項

範本見 `template/table/use__Table__Actions.ts`。一般的新增與編輯使用 `newAction`、`editAction`，無須直接呼叫 `openForm`。

| 選項 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `string?` | 要編輯的列。省略時為新增 |
| `defaults` | `Record<string, unknown>?` | 新增時的初始值，覆蓋 schema 的 `default` |
| `order` | `string[]?` | 這一次的欄位順序，覆寫 schema 的 `formOrder` |
| `lockId` | `boolean?` | 主鍵欄是否唯讀。省略時，編輯為唯讀，新增可填寫。主鍵只能由 `defaults` 帶入時，傳入 `true` |
| `content` | `Component?` | 表單下方額外放置的內容，例如說明、預覽。接收 `row` prop。一般不使用 |

## 備註

- **標題**依 `tableLabel` 產生，例如「新增訂單」。中文與英文之間加上空格
- **狀態的優先順序**為 loading → loadError → 找不到資料 → 表單。前三種狀態由 [PageState](../page/PageState.md) 顯示。「找不到這一列」使用 `warning`，不使用 `error`
- 欄位的錯誤訊息由 `DataForm` 顯示於各欄下方。送出失敗的訊息屬於整張表單，顯示於表單下方，表單留在畫面上
- **新增父列**只在第一層的表單中提供（見 [schema.md](../../topics/schema.md#選擇器中新增父列)）
- 返回鍵由表單層的堆疊處理，因此 `v-dialog` 皆設定 `close-on-back="false"`
