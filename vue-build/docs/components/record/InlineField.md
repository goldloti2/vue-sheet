# InlineField

詳細頁快速編輯的一欄：以 [FieldInput](FieldInput.md) 顯示這一列某個真實欄位的值，改了就以 `store.update` 寫入。由 [DataDetail](DataDetail.md) 依 `editable` 建立，**頁面一般不直接使用**，在頁面上指定 `editable` 即可。

## 何時寫入

- **打字類的欄位**（`text`、`image`、`duration`、`number`，以及 `allowCustom` 的 `select`）：輸入時先暫存，焦點離開或按 Enter 才寫入
- **其餘欄位**（`select`、`ref`、`boolean`、`date`）：值一改就寫入
- **沒有焦點時的變動**（數字的 −／＋、清除鈕）一律立即寫入
- **值與快取相同時不寫入**
- **元件卸載前**（輸入到一半就換頁或換到另一筆）補寫一次暫存的值

## 驗證

寫入前以 `validateRow` 只驗這一欄（用合併後的整列，跨欄位的 `validate` 看得到其他欄）。不通過時不寫入，錯誤顯示於欄位下方，輸入框保留使用者輸入的內容，改回合法的值後即可寫入。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填** |
| `schema` | `TableSchema` | **必填** |
| `row` | `{ id: string }` | **必填**，快取中的那一列 |
| `column` | `SchemaColumn` | **必填**，要編輯的真實欄位 |

## 備註

- **外觀**：`variant="outlined"`（有外框，看得出是輸入框）、`density="compact"`，錯誤訊息只在有錯時佔位
- **快取中的值被別處改掉時**，沒有正在輸入就跟著更新
- **擋下觸控事件**：在輸入框中拖曳不會觸發詳細頁的左右滑動換筆
