# DataCard

card 式列表的**單一張卡片**：上下共四層，未指定任何位置的那一層整層隱藏。與 [DataProfile](DataProfile.md) 相同，卡片之間有間隔，點擊卡片進入詳細頁。

- 各位置由 card 專用的 view（`defineCardView`）指定，分為 `header`、`body` 兩組。每一組可用的位置與 [DataList](DataList.md#view) 的 view 相同
- 元件本身不做迴圈。列表頁將此元件置於 [ListPage](../page/ListPage.md) 的 slot 中，其他地方以 `v-for` 或 `GroupedList` 的 slot 使用
- 提供 `to` 時，整張卡片即為連結
- 多選的接法與 DataList 相同：`v-bind` `ListPage` 的 slot 提供的 `props`，自行組合時使用 `selection.itemProps(row.id)`。如此一次綁定 `selectable`、`selectMode`、`selected` 與長按、點選的事件

## Usage

範本見 `template/pages/card-list.vue`。範本示範 `defineCardView`，以及第 4 層左右各兩格的寫法，包括文字按鈕與空格。

## 四層

| 層 | 來源 | 內容 |
| --- | --- | --- |
| 1 | `header` | 左側的圓形頭像（`image`），右側上下排列標題（`title`）與副標（`subtitle`），過長時以省略號截斷。沒有選單 |
| 2 | `body.image` | 寬度撐滿卡片的大圖，比例固定，裁切填滿（`object-fit: cover`）。比例見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」 |
| 3 | `body` | 標題（`title`）、副標（`subtitle`）與摘要（`summary`）。摘要可換行，最多三行 |
| 4 | `actions` | 最多四格，由 [ViewActions](../view/ViewActions.md) 的 `variant="slots"` 呈現：前兩格靠左，後兩格靠右，`null` 保留為空格，第五個以後不顯示。每一格依 `display` 顯示為圖示或文字 |

- 第 1 層的三個位置皆未指定時，第 1 層隱藏。第 3 層的規則與第 1 層相同
- 第 2 層只在指定 `body.image` 時出現
- 第 4 層於四格皆為 `null` 時隱藏，多選模式下也隱藏
- 已指定但這一列沒有值的位置保留：文字保留一行的高度，頭像保留同大小的空白，大圖以同樣大小的方塊佔位
- `header` 與 `body` 各自指定欄位，可放相同或不同的欄位。`aside` 不顯示

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `row` | `Row` | **必填**，要顯示的那一列 |
| `view` | `CardView<Row>` | **必填**，`defineCardView` 的回傳值 |
| `to` | `string?` | 提供時整張卡片為連結。未提供時為純顯示的一張卡片 |
| `selectable` | `boolean?` | 預設 `false`。開啟時才綁定長按的監聽，並禁止選取文字與拖曳 |
| `selectMode` | `boolean?` | 目前是否為多選模式 |
| `selected` | `boolean?` | 這一張是否已選取 |
| `current` | `boolean?` | dashboard 的面板開啟 `selects` 時，這一張是否為選取的那一列。選取的那一列左側有一條細邊，可與多選的淡底同時出現 |
| `marked` | `boolean?` | dashboard 面板的 `mark` 中有這一列時為 `true`。左側的細邊為較淡的主色。同時為 `current` 時，以 `current` 為準 |
| `pickable` | `boolean?` | dashboard 的面板開啟 `selects` 時為 `true`：點擊改為發出 `pick`，不導覽 |

## Emits

| event | 說明 |
| --- | --- |
| `longpress` | 長按時發出，只在 `selectable` 時發出 |
| `toggle` | 多選模式下點擊時發出。此時不導覽 |
| `pick` | `pickable` 時點擊發出，多選模式除外。帶修飾鍵或中鍵的點擊仍交由瀏覽器開新分頁 |

## 備註

- **連結的做法與 DataList 相同**：元件自行組成帶 `href` 的 `<a>`，不使用 `RouterLink`。此元件與 DataList、DataProfile 共用 `useRowClick`。第 4 層與連結並列，不包在 `<a>` 中。第 4 層本身不接收點擊，只有按鈕接收，因此按鈕之間的空白處仍屬於連結
- **勾選圖示疊於卡片左上角**：多選模式下，勾選圖示以絕對定位疊於左上角，不受各層有無內容影響。圖示帶有圓形背景，疊在大圖上也能辨識。選取的卡片疊上一層淡底
- **間隔由元件本身負責**：卡片帶有下方間距、圓角、外框與偏向右下的陰影，`ListPage` 與 `GroupedList` 無須另外設定。間距、圓角、陰影與點擊、選取的樣式定義於 `src/styles/list.css`，與其他列表元件共用（見 [ListLayout](ListLayout.md) 的「共用的樣式」）
- **`content-visibility: auto`**：瀏覽器不排版與繪製畫面外的卡片。`contain-intrinsic-size` 不寫死，元件依出現的層加總出替代高度：
  - 第 1、2、4 層的高度見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」，第 3 層依出現的欄位
  - 各層的高度以 CSS 變數由 inline style 傳入
  - 大圖的高度依卡片的寬度與大圖的比例估算。`ListLayout` 外包的一層為不具名的 container，因此 `100cqw` 即為卡片的寬度。不在 `ListLayout` 中時，改以視窗寬度估算
  - 各層的版型大幅變動時，須一併調整此計算
- **dashboard 中的窄版**：所在面板為[窄面板](../../design/dashboard.md#窄面板)時，省略第 3 層，替代高度也不計入第 3 層。一般頁面不會觸發窄版
