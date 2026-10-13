# ListLayout

列表中各筆的外框，決定各筆如何排列：

| `layout` | 排法 | 使用者 |
| --- | --- | --- |
| `list`（預設） | 依序往下排，不另外包裝，DOM 與未使用本元件時相同 | deck、profile、card |
| `grid` | 格狀排列：`repeat(auto-fill, minmax(140px, 1fr))`，間隔為 `--list-card-gap`，最後一列下方留出陰影的範圍（`--list-card-shadow-extent`） | gallery |

**一般不需要直接使用**：[ListPage](ListPage.md) 與 [GroupedList](GroupedList.md) 的 `layout` prop 會轉交給它。分組時，每一組底下的各筆各自排列，組的標題一律佔一整行。

## 欄寬

`minmax(140px, 1fr)` 使手機恰可並排兩欄；畫面寬約 468px 起為三欄，一般手機的寬度皆在此之下。平板與桌面依寬度自動增加欄數，不另外設定斷點。

## 卡片的間距與陰影

profile、card、gallery 的間距、陰影與陰影往外擴出的範圍，定義為 `src/styles/list.css` 的 CSS 變數，各處皆讀取同一個值：

| 變數 | 值 | 使用者 |
| --- | --- | --- |
| `--list-card-gap` | `8px` | DataProfile、DataCard 的下方間距，本元件 `grid` 的格線間隔 |
| `--list-card-shadow` | `2px 3px 6px rgba(0, 0, 0, 0.16)` | DataProfile、DataCard、DataGallery 的 `box-shadow` |
| `--list-card-shadow-extent` | `8px`（偏移 + 模糊） | GroupedList 分組內容的左右外擴、本元件 `grid` 的下方內距 |

- 調整陰影時須一併調整 `--list-card-shadow-extent`，否則分組展開的動畫期間陰影會被裁切（見 [GroupedList](GroupedList.md) 的備註）
- profile 與 card 下方的陰影落於 `--list-card-gap` 之中，因此間距不可小於 `--list-card-shadow-extent`

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `layout` | `'list' \| 'grid'` | 預設 `'list'`，見上表 |
