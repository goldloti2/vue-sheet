# ListLayout

列表中各筆的外框，決定各筆如何排列：

| `layout` | 排法 | 使用者 |
| --- | --- | --- |
| `list`（預設） | 依序往下排，不另外包裝，DOM 與未使用本元件時相同 | deck、profile、card |
| `grid` | 格狀排列：`repeat(auto-fill, minmax(140px, 1fr))`，間隔 8px | gallery |

**一般不需要直接使用**：[ListPage](ListPage.md) 與 [GroupedList](GroupedList.md) 的 `layout` prop 會轉交給它。分組時，每一組底下的各筆各自排列，組的標題一律佔一整行。

## 欄寬

`minmax(140px, 1fr)` 使手機恰可並排兩欄；畫面寬約 468px 起為三欄，一般手機的寬度皆在此之下。平板與桌面依寬度自動增加欄數，不另外設定斷點。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `layout` | `'list' \| 'grid'` | 預設 `'list'`，見上表 |
