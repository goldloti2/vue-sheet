# ListLayout

列表中各列的外框，決定各列的排列方式：

| `layout` | 排法 | 使用者 |
| --- | --- | --- |
| `list`（預設） | 依序往下排列，不另外包裝。DOM 與未使用此元件時相同 | deck、profile、card |
| `grid` | 格狀排列：每一欄有最小寬度，以 `repeat(auto-fill, minmax(…, 1fr))` 依可用寬度決定欄數，間隔為 `--list-card-gap`。最後一列下方留出陰影的範圍（`--list-card-shadow-extent`） | gallery |

**一般無須直接使用此元件**。[ListPage](../page/ListPage.md) 與 [GroupedList](GroupedList.md) 將自身的 `layout` prop 轉交給此元件。分組時，每一組中的列各自排列，組的標題一律佔一整行。

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
| `--list-card-shadow-extent` | 陰影往右下擴出的距離（偏移 + 模糊） | GroupedList 分組內容的左右外擴，此元件 `grid` 的下方內距 |

- 各變數的值見 [design/list.md](../../design/list.md#尺寸與樣式) 的「尺寸與樣式」
- 調整陰影時，須一併調整 `--list-card-shadow-extent`
- profile 與 card 下方的陰影落於 `--list-card-gap` 之中，因此間距不可小於 `--list-card-shadow-extent`

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
