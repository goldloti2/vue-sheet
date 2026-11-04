# DataGallery

gallery 式列表的**單一格**：上方為正方形圖片，下方為標題與副標，右下角以 ⋮ 選單收納這一列的動作。須搭配 [ListPage](../page/ListPage.md) 的 `layout="grid"` 使用，各格才會格狀排列（見 [ListLayout](ListLayout.md)）。

此元件與 [DataList](DataList.md) 的共同點：
- 各欄位的位置由 view（`defineView`）指定，元件本身不做迴圈
- 提供 `to` 時，整格即為連結
- 多選的接法相同：`v-bind` `ListPage` 的 slot 提供的 `props`

## Usage

範本見 `template/pages/gallery-list.vue`。`ListPage` 須設定 `layout="grid"`。

## 使用的位置

此元件只使用下列位置。其餘位置（`summary`、`aside`）即使指定也不顯示。標題與副標未指定時不顯示，已指定但這一列沒有值時保留一行。

| 位置 | 顯示於 |
| --- | --- |
| `image` | 上方的正方形圖片，上、左、右留白，裁切填滿。沒有圖片時，以同樣大小的方塊佔位 |
| `title` | 圖片下方，佔滿寬度，一行。過長時以省略號截斷 |
| `subtitle` | 標題下方，一行，右側留出 ⋮ 的寬度 |
| `actions` | 整格右下角的 ⋮ 選單，由 [ViewActions](../view/ViewActions.md) 的 `variant="menu"` 呈現。只有一個動作時也收入選單。沒有動作時不顯示 ⋮。多選模式下隱藏 |

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，要顯示的那一列 |
| `view` | `RowView<Row>` | **必填**，`defineView` 的回傳值 |
| `to` | `string?` | 提供時整格為連結。未提供時為純顯示的一格 |
| `selectable` | `boolean?` | 預設 `false`。開啟時才綁定長按的監聽，並禁止選取文字與拖曳 |
| `selectMode` | `boolean?` | 目前是否為多選模式 |
| `selected` | `boolean?` | 這一格是否已選取 |
| `current` | `boolean?` | dashboard 的面板開啟 `selects` 時，這一格是否為選取的那一列。選取的那一列左側有一條細邊，可與多選的淡底同時出現 |
| `pickable` | `boolean?` | dashboard 的面板開啟 `selects` 時為 `true`：點擊改為發出 `pick`，不導覽 |

## Emits

| event | 說明 |
| --- | --- |
| `longpress` | 長按時發出，只在 `selectable` 時發出 |
| `toggle` | 多選模式下點擊時發出。此時不導覽 |
| `pick` | `pickable` 時點擊發出，多選模式除外。帶修飾鍵或中鍵的點擊仍交由瀏覽器開新分頁 |

## 備註

- **整格的比例固定**：寬度由欄寬決定，圖片為正方形，圖片下方剩餘的高度為文字區，放得下標題與副標各一行。比例見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」
- **連結的做法與 DataList 相同**：元件自行組成帶 `href` 的 `<a>`，不使用 `RouterLink`。此元件與 DataList、DataProfile、DataCard 共用 `useRowClick`。⋮ 與連結並列，點擊 ⋮ 不進入詳細頁
- **勾選圖示疊於圖片左上角**：多選模式下出現，帶有圓形背景。選取的格子疊上一層淡底
- **外框為直角**：格子帶有外框與偏向右下的陰影，間隔由 `ListLayout` 的格線負責。間距、陰影與點擊、選取的樣式定義於 `src/styles/list.css`，與其他列表元件共用（見 [ListLayout](ListLayout.md) 的「共用的樣式」）
- **`content-visibility: auto`**：瀏覽器不排版與繪製畫面外的格子。高度由 `aspect-ratio` 依欄寬決定，無須設定 `contain-intrinsic-size` 的替代值
