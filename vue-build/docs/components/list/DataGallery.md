# DataGallery

gallery 式列表的**單一格**：上方為正方形圖片，下方為標題與副標，右下角以 ⋮ 選單收納該列的動作。須搭配 [ListPage](../page/ListPage.md) 的 `layout="grid"` 使用，各格才會格狀排列（見 [ListLayout](ListLayout.md)）。

與 [DataList](DataList.md) 相同，各欄位的位置由 view（`defineView`）指定，自身不做迴圈。給了 `to` 整格就是連結。多選的接法亦與 DataList 相同：`v-bind` 上 `ListPage` slot 給的 `props`。

## Usage

範本見 `template/pages/gallery-list.vue`（`ListPage` 須給 `layout="grid"`）。

## 使用的位置

本元件僅使用以下位置，其餘位置（`summary`、`aside`）即使指定亦不顯示：

| 位置 | 顯示於 |
| --- | --- |
| `image` | 上方的正方形圖片，周圍留白 8px，裁切填滿；沒有圖片時以同樣大小的灰色方塊佔位 |
| `title` | 圖片下方，佔滿寬度，一行，過長時以省略號截斷 |
| `subtitle` | 標題下方，一行，右側留出 ⋮ 的寬度 |
| `actions` | 整格右下角的 ⋮ 選單，由 [ViewActions](../view/ViewActions.md) 的 `variant="menu"` 呈現。只有一個動作時亦收入選單；沒有動作時不顯示 ⋮；多選模式下隱藏 |

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，要顯示的那一列 |
| `view` | `RowView<Row>` | **必填**，`defineView` 的回傳值 |
| `to` | `string?` | 有給才是連結；沒給就是純顯示的一格 |
| `selectable` | `boolean?` | 預設 `false`。開了才綁長按監聽、才會禁止文字選取與拖曳 |
| `selectMode` | `boolean?` | 目前在不在多選模式 |
| `selected` | `boolean?` | 這一格有沒有被選 |
| `current` | `boolean?` | dashboard 開啟互動時，是否為選取的那一筆（左側一條主色的細邊，與多選的淡底可同時出現） |
| `pickable` | `boolean?` | dashboard 開啟互動時為 `true`：點擊改為發出 `pick`，不導覽 |

## Emits

| event | 說明 |
| --- | --- |
| `longpress` | 長按觸發，只有 `selectable` 時會發 |
| `toggle` | 多選模式下點擊觸發；此時不會導覽 |
| `pick` | `pickable` 時點擊觸發（多選模式除外）；帶修飾鍵或中鍵的點擊仍交由瀏覽器開新分頁 |

## 備註

- **整格固定為 3:4**：寬度由欄寬決定，圖片為正方形，其下剩餘的高度為文字區。手機上文字區約 50–60px，可容納標題與副標各一行
- **連結與 DataList 相同**：自行組 `href` 的 `<a>`，不使用 `RouterLink`，與 DataList、DataProfile、DataCard 共用 `useRowClick`。⋮ 與連結並列，點擊 ⋮ 不會進入 detail
- **勾選圖示疊於圖片左上角**：多選模式下出現，帶有卡片底色的圓形背景；被選取的格子疊上一層主色淡底
- **外框為直角**：帶有外框與偏向右下的陰影，間隔由 `ListLayout` 的格線負責。間距、陰影與點擊、選取的樣式定義於 `src/styles/list.css`，與其他列表元件共用（見 [ListLayout](ListLayout.md) 的「共用的樣式」）
- **`content-visibility: auto`**：畫面外的格子不進行排版與繪製。高度由 `aspect-ratio` 依欄寬決定，不需 `contain-intrinsic-size` 的替代值
