# DataChart

以 Chart.js 畫出 `defineChart` 宣告的圖表（宣告方式與計算規則見 [chart.md](../../topics/chart.md)）。元件只負責畫圖與回報點擊，載入狀態與點擊後的處理由頁面或 `ChartPage` 負責。

## Usage

頁面通常使用 [ChartPage](../page/ChartPage.md)，由它使用此元件。版面確實不同時，才直接使用此元件：頁面以 `useListPage` 取得 `rows`，以 `defineChart` 宣告圖表，兩者交給此元件。點擊時依事件決定後續的動作，例如進入詳細頁。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `chart` | `ChartDefinition<Row>` | **必填**，`defineChart` 的回傳值 |
| `rows` | `readonly Row[]` | **必填**，要畫成圖表的列，通常為 `useListPage` 的 `rows` |

## Emits

| 事件 | 參數 | 說明 |
| --- | --- | --- |
| `group` | `group: ChartGroupData<Row>`、`index: number` | 點擊分組類圖表的一組。`group` 為該組的列與篩選條件，`index` 對應 `compute` 結果的 `groups` 與 `labels` |
| `row` | `row: Row` | 點擊 scatter 或 bubble 的一點，參數為該點的那一列 |

## 備註

- **Chart.js 於元件掛載時才載入**：以動態 import 載入 `chart.js/auto`，打包時成為獨立的檔案。沒有圖表的頁面不下載 Chart.js
- **`rows` 或主題改變時更新圖表**：元件以 `computed` 執行 `compute(rows)`，換上新的設定後呼叫 Chart.js 的 `update()`。卸載時銷毀 Chart.js 的實例
- **顏色**依 `plugins/vuetify.ts` 的 `sharedColorNames` 輪流使用，取自目前主題的色值。圓餅類依組上色，其他圖表依 dataset 上色。文字與格線取自主題的 `on-surface`
- **刻度與提示依 dataset 的 `unit` 格式化**：`percent` 加上「%」，`duration` 為「時:分:秒」，`date` 為 `yyyy/mm/dd`，其餘最多兩位小數
- **bubble 的半徑換算為 4 至 20 像素**：依資料中半徑欄位的最小值與最大值等比換算。提示中顯示原本的值
- **高度隨所在的容器**，至少 280px。`ChartPage` 指定這個容器的高度。直接使用此元件時，由外層指定高度
- 設定的組成位於同一資料夾的 `chartConfig.ts`，為純函數
