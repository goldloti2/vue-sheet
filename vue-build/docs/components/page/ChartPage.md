# ChartPage

圖表頁的整頁版型：載入狀態、圖表的高度、高光，以及點擊後進入詳細頁或寫入條件。圖表本身由 [DataChart](../chart/DataChart.md) 繪製，宣告方式與計算規則見 [chart.md](../../topics/chart.md)。

此元件搭配 `useListPage(table, schema)` 使用：
- 回傳的 `rows`、`loading`、`error` 直接對應此元件的 prop，`filters` 以 `v-model:filters` 傳入
- 搜尋、篩選與 `scope` 照常生效，圖表只畫出剩下的列
- 圖表以 `defineChart` 宣告於頁面，只執行一次。宣告於 `useListPage` 之前，`filterKeys` 傳入 `useListPage` 的 `ignoreFilter`
- 分組欄與系列欄上的條件因此不篩選列，改由圖表加上高光（見 [chart.md](../../topics/chart.md#分組欄與系列欄上的條件)）

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

## v-model

| model | 型別 | 說明 |
| --- | --- | --- |
| `filters` | `Filters` | 該表的篩選條件，通常為 `useListPage` 的 `filters`。分組欄與系列欄上的條件以高光標示。點擊圖例與互動儀表板中的點擊寫入此處。省略時只用於此元件之內 |

## 點擊

- **點擊分組類圖表的一組**：進入該組第一列的詳細頁。上一列、下一列在該組的列之間切換，順序與 `rows` 相同
- **開啟互動的儀表板中，點擊一組改為寫入條件**：寫入分組欄的條件，有系列時一併寫入系列欄的條件。再點擊同一組時移除這些條件
- **點擊 scatter 或 bubble 的一點**：進入該點那一列的詳細頁，沒有上一列與下一列
- **沒有列的組不換頁**，例如沒有資料的日期區間
- **點擊圖例**：切換該組或該系列的值是否勾選，可複選，與篩選抽屜相同
- 寫入的條件與例外見 [chart.md](../../topics/chart.md#點擊) 的「點擊」
- 順序以 `publishListOrder` 發布，與列表點擊一列時相同（見 [RecordNav](../record/RecordNav.md)）

## 備註

- **整頁時，可用的空間為 App Bar 與底部之間**，高度至少 280px
- **位於 dashboard 的面板中時，可用的空間為面板的內容區**（見 [DashboardPanel](../panel/DashboardPanel.md) 的備註）。面板展開時，視為整頁
- **圖表置中，寬與高各為可用空間的 90%**，四邊各留白 5%。可用空間不另加內距
- 沒有列時，畫出空的圖表
- 標題由頁面決定：單獨成頁時為 App Bar 的標題，面板中為面板的標題
