# DataProfile

profile 式列表的**單一張卡片**：左側為圓形頭像，中間上下排列標題與副標，右側以 ⋮ 選單收納這一列的動作。與 [DataList](DataList.md) 不同，卡片之間有間隔，不連成一串。點擊卡片進入詳細頁。

此元件與 DataList 的共同點：
- 各欄位的位置由 view（`defineView`）指定，元件本身不做迴圈。列表頁將此元件置於 [ListPage](../page/ListPage.md) 的 slot 中，其他地方以 `v-for` 或 `GroupedList` 的 slot 使用
- 提供 `to` 時，整張卡片即為連結
- 多選的接法相同：`v-bind` `ListPage` 的 slot 提供的 `props`，自行組合時使用 `selection.itemProps(row.id)`。如此一次綁定 `selectable`、`selectMode`、`selected` 與長按、點選的事件

## Usage

範本見 `template/pages/profile-list.vue`。

## 使用的位置

view 的定義方式見 [DataList](DataList.md#view)。此元件只使用下列位置，其餘位置（`summary`、`aside`）即使指定也不顯示。

| 位置 | 顯示於 |
| --- | --- |
| `title` | 中間上方。過長時以省略號截斷 |
| `subtitle` | 中間下方。過長時以省略號截斷 |
| `image` | 左側的圓形頭像，圖片裁切填滿（`object-fit: cover`）。未指定時不顯示，標題往左靠齊。已指定但這一列沒有圖片時，保留同大小的空白。多選模式下，勾選圖示置於頭像左側 |
| `actions` | 右側的 ⋮ 選單，由 [ViewActions](../view/ViewActions.md) 的 `variant="menu"` 呈現。只有一個動作時也收入選單。沒有動作時不顯示 ⋮。多選模式下隱藏 |

標題與副標未指定時不顯示，已指定但沒有值時保留一行。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，要顯示的那一列 |
| `view` | `RowView<Row>` | **必填**，`defineView` 的回傳值 |
| `to` | `string?` | 提供時整張卡片為連結。未提供時為純顯示的一張卡片 |
| `selectable` | `boolean?` | 預設 `false`。開啟時才綁定長按的監聽，並禁止選取文字與拖曳 |
| `selectMode` | `boolean?` | 目前是否為多選模式 |
| `selected` | `boolean?` | 這一張是否已選取 |
| `current` | `boolean?` | dashboard 的面板開啟 `selects` 時，這一張是否為選取的那一列。選取的那一列左側有一條細邊，可與多選的淡底同時出現 |
| `pickable` | `boolean?` | dashboard 的面板開啟 `selects` 時為 `true`：點擊改為發出 `pick`，不導覽 |

## Emits

| event | 說明 |
| --- | --- |
| `longpress` | 長按時發出，只在 `selectable` 時發出 |
| `toggle` | 多選模式下點擊時發出。此時不導覽 |
| `pick` | `pickable` 時點擊發出，多選模式除外。帶修飾鍵或中鍵的點擊仍交由瀏覽器開新分頁 |

## 備註

- **連結的做法與 DataList 相同**：元件自行組成帶 `href` 的 `<a>`，不使用 `RouterLink`。此元件與 DataList、[DataCard](DataCard.md) 共用 `useRowClick`。⋮ 按鈕與連結並列，不包在 `<a>` 中，點擊 ⋮ 不進入詳細頁
- **勾選圖示置於頭像左側**：多選模式下，勾選圖示出現於卡片最左側。未指定頭像時，勾選圖示直接接在標題左側。選取的卡片疊上一層淡底
- **間隔由元件本身負責**：卡片帶有下方間距、圓角、外框與偏向右下的陰影，`ListPage` 與 `GroupedList` 無須另外設定。間距、圓角、陰影與點擊、選取的樣式定義於 `src/styles/list.css`，與其他列表元件共用（見 [ListLayout](ListLayout.md) 的「共用的樣式」）
- **`content-visibility: auto`**：瀏覽器不排版與繪製畫面外的卡片。`contain-intrinsic-size` 為量得實際高度之前的替代值，取一張卡片的高度（見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」）。卡片的版型大幅變動時，須一併調整此數值
