# FormattedValue

顯示一欄的值與其條件式格式（見 [schema.md](../../topics/schema.md#條件式格式)）：圖示依序在前，文字套上顏色與字形。詳細頁的欄位與標頭、列表 view 的各位置、表格的儲存格、ref 欄位的選擇器，皆以此元件顯示值，**頁面一般不直接使用**。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `value` | `DisplayValue` | **必填**，`schema/format.ts` 的 `displayValue` 算出的文字與格式。view 的各文字位置即為此型別 |

## 備註

- **值為空時不顯示任何內容**：所在的元素維持 `:empty`，各版面「保留一行高度」的處理照常作用
- **字形**使用 Vuetify 的 class：`font-weight-bold`、`font-italic`、`text-decoration-underline`、`text-decoration-line-through`。底線與刪除線同時套用時，兩條線都顯示
- **顏色**為 Vuetify 主題的共用色名，登記於 `plugins/vuetify.ts`：`vuesheet-red`、`vuesheet-orange`、`vuesheet-yellow`、`vuesheet-green`、`vuesheet-blue`、`vuesheet-purple`、`vuesheet-grey`。色名的型別為 `ColorName`（`schema/types.ts`），圖表也使用同一組色名
  - 此元件套用 `text-vuesheet-*` 的 class
  - 其他地方也可使用：元件的 `color="vuesheet-red"`，或 `text-vuesheet-red`、`bg-vuesheet-red` 等 class，皆隨深淺色主題切換
  - 淺色主題與深色主題（`.v-theme--dark`）各有一組色值，見 [design/README.md](../../design/README.md#尺寸與樣式) 的「尺寸與樣式」
  - 未指定顏色時，沿用所在元素的文字顏色
- **圖示**的大小見 [design/README.md](../../design/README.md#尺寸與樣式) 的「尺寸與樣式」。未指定 `iconColor` 時，圖示與文字同色
