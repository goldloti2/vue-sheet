# ListLayout

列表中各列的外框，決定各列的排列方式：

| `layout` | 排法 | 使用者 |
| --- | --- | --- |
| `list`（預設） | 依序往下排列 | deck、profile、card |
| `grid` | 格狀排列：每一欄有最小寬度，以 `repeat(auto-fill, minmax(…, 1fr))` 依可用寬度決定欄數，間隔為 `--list-card-gap` | gallery |

**一般無須直接使用此元件**。[ListPage](../page/ListPage.md) 與 [GroupedList](GroupedList.md) 將自身的 `layout` prop 轉交給此元件。分組時，每一組中的列各自排列，組的標題一律佔一整行。

## 留白

列表的留白由此元件依內容決定，`ListPage` 與 `GroupedList` 本身不留白：
- **list 式的列（DataList）貼齊外緣**
- **內容為卡片（`.list-card`）時，四周留白**，放得下卡片的陰影。`grid` 一律留白
- 數值見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」

各列外包的一層為不具名的 container（`container-type: inline-size`）。列表元件以 `cqw` 依這一層的寬度估計畫面外各列的高度（見 [DataCard](DataCard.md) 的備註）。此 container 不具名，不影響 dashboard 以 `@container dashboard-panel` 判斷的窄版。

## 欄寬

- 欄數依可用寬度自動決定，不另外設定斷點。最小欄寬與各寬度的欄數見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」

## 共用的樣式

列表中的一列與卡片共用的樣式定義於 `src/styles/list.css`。

### 變數

| 變數 | 內容 | 使用者 |
| --- | --- | --- |
| `--list-card-gap` | 卡片之間的間距 | DataProfile、DataCard 的下方間距，此元件 `grid` 的格線間隔 |
| `--list-card-radius` | 卡片的圓角 | DataProfile、DataCard 的圓角。DataGallery 為直角，不套用 |
| `--list-card-shadow` | 卡片的陰影 | `.list-card` 的 `box-shadow` |

- 各變數的值見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」
- 調整陰影時，此元件的留白與 `--list-card-gap` 皆須放得下陰影往右下擴出的範圍

### class

| class | 內容 | 使用者 |
| --- | --- | --- |
| `.list-row` | 一列的根元素，`position: relative`，供連結的 `::after` 定位 | DataList、DataProfile、DataCard、DataGallery |
| `.list-row-link` | 連結：沿用文字顏色，沒有底線，`::after` 覆蓋整列 | DataList、DataProfile、DataCard、DataGallery |
| `.list-row-above-link` | 疊於連結之上的動作，`position: relative; z-index: 1`。元件可另以絕對定位擺放 | DataList、DataProfile、DataCard、DataGallery |
| `.list-row--no-select` | 開啟長按多選時，禁止選取文字與拖曳 | DataList、DataProfile、DataCard、DataGallery |
| `.list-row--selected` | 選取時的淡底 | DataList、DataProfile、DataCard、DataGallery |
| `.list-card` | 卡片的底色、外框與陰影。圓角與間距由各元件決定 | DataProfile、DataCard、DataGallery |

- **淡底以 `background-image` 疊於原本的底色之上**：元件的底色須以 `background-color` 指定，不可使用 `background` 簡寫
- **淡底不寫成 `:root` 的變數**

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `layout` | `'list' \| 'grid'` | 預設 `'list'`，見上表 |
