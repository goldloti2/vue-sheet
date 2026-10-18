# ListLayout

列表中各筆的外框，決定各筆如何排列：

| `layout` | 排法 | 使用者 |
| --- | --- | --- |
| `list`（預設） | 依序往下排，不另外包裝，DOM 與未使用本元件時相同 | deck、profile、card |
| `grid` | 格狀排列：`repeat(auto-fill, minmax(140px, 1fr))`，間隔為 `--list-card-gap`，最後一列下方留出陰影的範圍（`--list-card-shadow-extent`） | gallery |

**一般不需要直接使用**：[ListPage](../page/ListPage.md) 與 [GroupedList](GroupedList.md) 的 `layout` prop 會轉交給它。分組時，每一組底下的各筆各自排列，組的標題一律佔一整行。

## 欄寬

`minmax(140px, 1fr)` 使手機恰可並排兩欄；畫面寬約 468px 起為三欄，一般手機的寬度皆在此之下。平板與桌面依寬度自動增加欄數，不另外設定斷點。

## 共用的樣式

列表中的一列與卡片共用的樣式定義於 `src/styles/list.css`。

### 變數

| 變數 | 值 | 使用者 |
| --- | --- | --- |
| `--list-card-gap` | `8px` | DataProfile、DataCard 的下方間距，本元件 `grid` 的格線間隔 |
| `--list-card-radius` | `12px` | DataProfile、DataCard 的圓角（DataGallery 為直角，不套用） |
| `--list-card-shadow` | `2px 3px 6px rgba(0, 0, 0, 0.16)` | `.list-card` 的 `box-shadow` |
| `--list-card-shadow-extent` | `8px`（偏移 + 模糊） | GroupedList 分組內容的左右外擴、本元件 `grid` 的下方內距 |

- 調整陰影時須一併調整 `--list-card-shadow-extent`
- profile 與 card 下方的陰影落於 `--list-card-gap` 之中，因此間距不可小於 `--list-card-shadow-extent`

### class

| class | 內容 | 使用者 |
| --- | --- | --- |
| `.list-row` | 一列的根元素，`position: relative`（供連結的 `::after` 定位） | DataList、DataProfile、DataCard、DataGallery |
| `.list-row-link` | 連結：沿用文字顏色、無底線，`::after` 覆蓋整列 | 同上 |
| `.list-row-above-link` | 疊於連結之上的動作，`position: relative; z-index: 1`；元件可另以絕對定位擺放 | 同上 |
| `.list-row--no-select` | 開啟長按多選時，禁止文字選取與拖曳 | 同上 |
| `.list-row--selected` | 被選取時的主色淡底 | 同上 |
| `.list-card` | 卡片的底色、外框與陰影；圓角與間距由各元件決定 | DataProfile、DataCard、DataGallery |

- **淡底以 `background-image` 疊於原本的底色之上**：元件的底色須以 `background-color` 指定，不可用 `background` 簡寫
- **淡底不寫成 `:root` 的變數**

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `layout` | `'list' \| 'grid'` | 預設 `'list'`，見上表 |
