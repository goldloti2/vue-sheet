# FieldInput

單一真實欄位的輸入元件，依 `column.type` 自動選擇。[DataForm](DataForm.md) 的每一欄與詳細頁的快速編輯（[InlineField](InlineField.md)）皆使用此元件，**頁面一般不直接使用**。

| 型別 | 輸入元件 |
| --- | --- |
| `text` | `v-text-field`。`multiline` 時為 `v-textarea`，高度隨內容增加 |
| `image` | `v-text-field`，填入網址或 Drive 連結 |
| `number` | `v-number-input` |
| `date` | `v-date-input` |
| `duration` | `v-text-field`，填入「時:分:秒」 |
| `boolean` | `v-btn-toggle`：左「否」右「是」兩個互斥的按鈕。再按一次已選取的按鈕，即清空 |
| `select` | `v-select`。`allowCustom` 時為 `v-combobox` |
| `ref` | `v-autocomplete`：父表整張表的可搜尋下拉清單，每一項的文字為父列的 `$label` |

虛擬欄位不經過此元件，由 DataForm 以唯讀的文字框自行顯示。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `unknown` | 這一欄的值。文字類的空字串一律存為 `null` |
| `column` | `SchemaColumn` | **必填** |
| `schema` | `TableSchema` | **必填**，`suggestedValues` 的 `rows` 依此反查所屬的表 |
| `row` | `object?` | 正在編輯的那一列，getter 已掛上，傳給 `suggestedValues` |
| `label` | `string?` | 省略時不顯示標籤。詳細頁的欄位名稱另外顯示 |
| `required` | `boolean?` | 標籤後加上錯誤色的「*」 |
| `errorMessages` | `string \| string[]?` | 顯示於欄位下方 |

其餘的屬性與事件（例如 `readonly`、`hint`、`density`、`variant`、`@update:focused`、`@keydown`）原樣交給內層的 Vuetify 元件。

## 備註

- **瀏覽器的輸入紀錄**：所有輸入框皆不顯示瀏覽器記住的輸入紀錄，由 `plugins/vuetify.ts` 的元件預設值設定。搜尋列與篩選抽屜的輸入框也相同
- **必填的標記**：以 CSS 的 `::after` 加在 `.v-label` 後面，`label` 本身不變
- **數字欄位**：
  - −／＋ 皆在欄位右側，以 `inset` 呈現。元件以 `increment`、`decrement` slot 取代預設的上下箭頭
  - `step` 取自 schema，預設為 1
  - `precision` 設為 `null`，不限制小數位數
- **日期欄位**：日曆圖示置於欄位內的右側
- **boolean 欄位**：
  - 按鈕組佔所在空間的固定比例並置中。所在空間在有標籤時為右欄，沒有標籤時（詳細頁的快速編輯）為整欄
  - 有標籤時，標籤與右欄的比例與詳細頁的標籤與值相同，標籤再長也只在左欄內換行
  - 選取的按鈕為 `tonal`，其餘按鈕為外框
  - 比例與按鈕的樣式見 [design/detail.md](../../design/detail.md#尺寸與樣式) 的「尺寸與樣式」
- **ref 欄位**：父表整張表載入共用快取，選項先依欄位的 `refSort`，再依父表的 `defaultSort` 排序
  - 選項與選取的值以 [FormattedValue](../view/FormattedValue.md) 顯示，套用父表 `labelColumn` 那一欄的條件式格式
  - 輸入文字搜尋時，選取的值隱藏，選項中符合的文字不另外標示
  - 有 `creatable` prop 且欄位設定 `allowCreate` 時，清單最上方多一項「新增…」（見 [schema.md](../../topics/schema.md#選擇器中新增父列)）
