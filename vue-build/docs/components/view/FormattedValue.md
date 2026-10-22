# FormattedValue

顯示一欄的值與它的條件式格式（見 [schema.md](../../topics/schema.md#條件式格式)）：圖示依序在前，文字套上顏色與字形。詳細頁的欄位與標頭、列表 view 的各位置、表格的儲存格皆以它畫出值，**頁面一般不直接使用**。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `value` | `DisplayValue` | **必填**，`schema/format.ts` 的 `displayValue` 算出的文字與格式；view 的各文字位置即為此型別 |

## 備註

- **值為空時不畫任何東西**：所在的元素維持 `:empty`，各版面「保留一行高度」的處理照常作用
- **字形**使用 Vuetify 的 class（`font-weight-bold`、`font-italic`、`text-decoration-underline`、`text-decoration-line-through`）；底線與刪除線同時套用時兩條線都畫
- **顏色**為元件內的 class，取自 Material Design 色板：淺色主題用較深的色值、深色主題（`.v-theme--dark`）用較淺的，皆以 APCA 對 Vuetify 預設的底色（淺色 `#FFFFFF`、深色 `#212121`）檢查達 Lc 60 以上。黃色例外：深色主題為 yellow A700（`#ffd600`）；色板中沒有在白底上達標的黃，淺色主題改用同一色相（OKLCH）降低亮度至達標的 `#a58a08`。未指定顏色時沿用所在元素的文字顏色
- **圖示**大小約與文字同高；未指定 `iconColor` 時與文字同色
