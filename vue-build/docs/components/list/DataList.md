# DataList

卡片式列表（deck）的**單一列**：左側為縮圖，右側四個角各顯示一個欄位。各欄位的位置由 **view** 指定（`defineView`，見下方），元件依欄位型別格式化。

- 元件本身不做迴圈。列表頁將此元件置於 [ListPage](../page/ListPage.md) 的 slot 中，迴圈與分組皆由 `ListPage` 處理。其他地方以 `v-for` 或 `GroupedList` 的 slot 使用
- 提供 `to` 時，整列即為連結
- 多選的四個 prop 無須逐一接上：`v-bind` `ListPage` 的 slot 提供的 `props` 即可，自行組合時使用 `selection.itemProps(row.id)`。如此一次綁定 `selectable`、`selectMode`、`selected` 與長按、點選的事件

## Usage

範本見 `template/pages/list.vue`：列表頁將 `DataList` 置於 `ListPage` 的 slot 中，並 `v-bind` 該 slot 提供的多選綁定。

## view

`defineView(schema, { … })` 定義於頁面中，回傳一個函式。此函式接收一列，回傳各位置應顯示的內容。欄位定義在建立時即查找完畢，之後每一列只須讀值與格式化。

每個位置皆可省略，沒有任何預設值：
- 省略的位置不顯示。上下兩行中，某一行的兩個位置皆省略時，整行不佔高度
- 左右兩欄各佔一半。同一側的兩個位置皆省略時，另一側延伸至整行，左側靠左，右側靠右
- 已指定但這一列沒有值的位置保留：文字保留一行的高度，縮圖保留同大小的空白。各列因此對齊
- 可填入的值為 schema 的欄位 key（真實欄位或虛擬欄位皆可），以及每一列皆有的 `id`、`$label`

| 位置 | 顯示於 |
| --- | --- |
| `title` | 左上 |
| `subtitle` | 右上 |
| `summary` | 左下 |
| `aside` | 右下 |
| `image` | 左側的縮圖，經由 `imageSrc` 轉換。大小見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」 |
| `actions` | 右下角欄位的下一行，由 [ViewActions](../view/ViewActions.md) 呈現：由左往右排列，整組靠右，`null` 略過。沒有動作時不佔高度。多選模式下隱藏 |

- 格式化的方式依欄位型別而定，與詳細頁相同（`formatColumnValue`）。例如日期依日期格式顯示，`ref` 欄位顯示父列的名稱
- 須合併多個欄位，或顯示父列、子列的資訊時，在 schema 的 `virtualColumns` 宣告虛擬欄位，不在頁面中組合字串
- 實作位於 `schema/view.ts`。同一個 view 也可交給 [DataProfile](DataProfile.md) 或 [DataGallery](DataGallery.md)，改以 profile 或 gallery 呈現
- [DataCard](DataCard.md) 使用同一組位置名稱，但分為兩組（`defineCardView`），見 [ROADMAP](../../../../ROADMAP.md) 的「頁面類型（對照 AppSheet）」
- 動作的定義方式見 [actions.md](../../topics/actions.md#列上的動作)

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，要顯示的那一列 |
| `view` | `RowView<Row>` | **必填**，`defineView` 的回傳值 |
| `to` | `string?` | 提供時整列為連結。未提供時為純顯示的一列 |
| `selectable` | `boolean?` | 預設 `false`。開啟時才綁定長按的監聽，並禁止選取文字與拖曳 |
| `selectMode` | `boolean?` | 目前是否為多選模式 |
| `selected` | `boolean?` | 這一列是否已選取 |
| `current` | `boolean?` | dashboard 開啟互動時，這一列是否為選取的那一列。選取的那一列左側有一條細邊，可與多選的淡底同時出現 |
| `pickable` | `boolean?` | dashboard 開啟互動時為 `true`：點擊改為發出 `pick`，不導覽 |

## Emits

| event | 說明 |
| --- | --- |
| `longpress` | 長按時發出，只在 `selectable` 時發出 |
| `toggle` | 多選模式下點擊時發出。此時不導覽 |
| `pick` | `pickable` 時點擊發出，多選模式除外。帶修飾鍵或中鍵的點擊仍交由瀏覽器開新分頁 |

## 備註

- **`to` 呈現為元件自行組成 href 的 `<a>`，不是 `RouterLink`**：
  - 點擊時執行 `router.push`
  - 帶修飾鍵或非左鍵的點擊交給瀏覽器，中鍵開新分頁為原生行為
  - 沒有 `router-link-active` 這組 class
  - 這部分與長按、多選的點擊判斷一併實作於 `useRowClick`，與 [DataProfile](DataProfile.md)、[DataCard](DataCard.md)、[DataGallery](DataGallery.md) 共用
- **動作的按鈕不在 `<a>` 中**：
  - 整列的外層為一個 `div`，連結與動作列並列
  - 連結以 `::after` 覆蓋整列，動作列疊於連結之上，寬度只包住按鈕
  - 因此動作列的空白處仍屬於連結：點擊進入詳細頁，長按進入多選。按鈕本身不觸發導覽與長按
- **`content-visibility: auto`**：瀏覽器不排版與繪製畫面外的列。`contain-intrinsic-size` 為量得實際高度之前的替代值，取一列的高度，有動作列時另加動作列的高度（見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」）。dashboard 的窄版沿用同一個值。列的版型大幅變動時，須一併調整此數值
- **dashboard 中的窄版**：所在面板為[窄面板](../../design/dashboard.md#窄面板)時，只顯示標題與副標，兩者上下排列並靠左，左下與右下隱藏。一般頁面不會觸發窄版
