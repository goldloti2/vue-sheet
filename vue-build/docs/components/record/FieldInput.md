# FieldInput

單一真實欄位的輸入元件，依 `column.type` 自動選擇。[DataForm](DataForm.md) 的每一欄與詳細頁的快速編輯（[InlineField](InlineField.md)）皆使用它，**頁面一般不直接使用**。

| 型別 | 輸入元件 |
| --- | --- |
| `text`、`image` | `v-text-field`；`image` 貼網址或 Drive 連結 |
| `number` | `v-number-input` |
| `date` | `v-date-input` |
| `duration` | `v-text-field`，填「時:分:秒」 |
| `boolean` | `v-btn-toggle`，左「否」右「是」兩顆互斥的按鈕，再按一次已選的即清空 |
| `select` | `v-select`；`allowCustom` 時為 `v-combobox` |
| `ref` | `v-autocomplete`，對方整表的可搜尋下拉清單，每列文字是對方的 `$label` |

虛擬欄位不經過它：DataForm 以唯讀的文字框自行顯示。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `unknown` | 這一欄的值。文字類的空字串一律存成 `null` |
| `column` | `SchemaColumn` | **必填** |
| `schema` | `TableSchema` | **必填**，`suggestedValues` 的 `rows` 由它反查自己這張表 |
| `row` | `object?` | 正在編輯的那一列（getter 已掛上），傳給 `suggestedValues` |
| `label` | `string?` | 省略時不顯示標籤（詳細頁的名稱另外顯示） |
| `required` | `boolean?` | 標籤後加上錯誤色的「*」 |
| `errorMessages` | `string \| string[]?` | 顯示於欄位下方 |

其餘屬性與事件（`readonly`、`hint`、`density`、`variant`、`@update:focused`、`@keydown`…）原樣交給內層的 Vuetify 元件。

## 備註

- **必填的標記**：以 CSS 的 `::after` 加在 `.v-label` 後面，`label` 本身不變
- **數字欄位**：−／＋ 都在欄位右側，以 `inset` 呈現（以 `increment`／`decrement` slot 換掉預設的上下箭頭）；`step` 取自 schema（預設 1）；`precision` 設為 `null`，不限制小數位數
- **日期欄位**：日曆圖示置於欄位內右側
- **boolean 欄位**：按鈕組一律佔所在空間的 62% 並置中。有標籤時，標籤與其餘空間為 38:62（與詳細頁的名稱與值相同），按鈕組佔其餘空間的 62%，標籤再長也只在左欄內換行；沒有標籤時（詳細頁的快速編輯）佔整欄的 62%。選中的那顆以主題色（primary）的淡色為底、主題色為字（`tonal`），其餘為外框
- **ref 欄位**：對方整張表載進共用快取，選項照對方的 `defaultSort` 排
