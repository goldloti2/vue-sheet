# ChartPage

圖表頁的整頁版型：載入狀態、圖表的高度，以及點擊後進入詳細頁。圖表本身由 [DataChart](../chart/DataChart.md) 繪製，宣告方式與計算規則見 [chart.md](../../topics/chart.md)。

此元件搭配 `useListPage(table, schema)` 使用：
- 回傳的 `rows`、`loading`、`error` 直接對應此元件的 prop
- 搜尋、篩選與 `scope` 照常生效，圖表只畫出剩下的列
- 圖表以 `defineChart` 宣告於頁面，只執行一次

## Usage

範本見 `template/pages/chart.vue`。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `table` | `TableKey` | **必填**，點擊後進入此表的詳細頁 |
| `chart` | `ChartDefinition<Row>` | **必填**，`defineChart` 的回傳值 |
| `rows` | `readonly Row[]` | **必填**，已篩選、搜尋過的列，通常為 `useListPage` 的 `rows` |
| `loading` | `boolean?` | 載入中，於圖表上方顯示長條進度列 |
| `error` | `string \| null?` | 載入失敗的訊息 |

## 點擊

- **點擊分組類圖表的一組**：進入該組第一列的詳細頁。上一列、下一列在該組的列之間切換，順序與 `rows` 相同
- **點擊 scatter 或 bubble 的一點**：進入該點那一列的詳細頁，沒有上一列與下一列
- **沒有列的組不換頁**，例如沒有資料的日期區間
- 順序以 `publishListOrder` 發布，與列表點擊一列時相同（見 [RecordNav](../record/RecordNav.md)）

## 備註

- **整頁時，可用的空間為 App Bar 與底部之間**，高度至少 280px
- **位於 dashboard 的面板中時，可用的空間為面板的內容區**（見 [DashboardPanel](../panel/DashboardPanel.md) 的備註）。面板展開時，視為整頁
- **圖表置中，寬與高各為可用空間的 90%**，四邊各留白 5%。可用空間不另加內距
- 沒有列時，畫出空的圖表
- 標題由頁面決定：單獨成頁時為 App Bar 的標題，面板中為面板的標題
