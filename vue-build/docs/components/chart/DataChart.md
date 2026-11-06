# DataChart

以 Chart.js 畫出 `defineChart` 宣告的圖表（宣告方式與計算規則見 [chart.md](../../topics/chart.md)）。元件只負責畫圖與回報點擊，載入狀態與點擊後的處理由頁面或 `ChartPage` 負責。

## Usage

頁面通常使用 [ChartPage](../page/ChartPage.md)，由它使用此元件。版面確實不同時，才直接使用此元件：頁面以 `useListPage` 取得 `rows`，以 `defineChart` 宣告圖表，兩者交給此元件。點擊時依事件決定後續的動作，例如進入詳細頁。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `chart` | `ChartDefinition<Row>` | **必填**，`defineChart` 的回傳值。`type` 為 `stat` 時改用 [DataStat](DataStat.md) |
| `rows` | `readonly Row[]` | **必填**，要畫成圖表的列，通常為 `useListPage` 的 `rows` |
| `filters` | `Filters?` | 該表的篩選條件。分組欄與系列欄上的條件以高光標示，省略時不標示 |
| `clickable` | `boolean?` | 預設 `true`。`false` 時點擊圖表與圖例皆沒有反應，不發出事件，圖例也不切換勾選。滑鼠移上時的提示照常顯示 |

## Emits

| 事件 | 參數 | 說明 |
| --- | --- | --- |
| `group` | `group: ChartGroupData<Row>`、`series: ChartGroupData<Row> \| null` | 點擊分組類圖表的一組。`group` 為該組的列與篩選條件，`series` 為點擊的長條或點所屬的系列，沒有系列時為 `null` |
| `row` | `row: Row` | 點擊 scatter 或 bubble 的一點，參數為該點的那一列 |
| `legend` | `pick: GroupFilter` | 點擊圖例中的一組或一個系列，參數為選取該項的篩選條件。該項沒有條件時不發出 |

- 圖例的一項為沒有系列的 dataset 時，此元件切換該項是否勾選，不發出事件。有勾選時只顯示勾選的 dataset（見 [topics/chart.md](../../topics/chart.md) 的「點擊圖例」）

## 備註

- **Chart.js 於元件掛載時才載入**：以動態 import 載入 `chart.js/auto`，打包時成為獨立的檔案。沒有圖表的頁面不下載 Chart.js
- **`rows`、`filters` 或主題改變時更新圖表**：元件以 `computed` 執行 `compute(rows)`，換上新的設定後呼叫 Chart.js 的 `update()`。卸載時銷毀 Chart.js 的實例
- **更新時沿用原本的 dataset 物件**，只換上新的屬性。顏色與數值由原本的狀態過渡，圖表不從零重畫
- **高光**：沒被選的組與系列調淡，判斷方式見 [chart.md](../../topics/chart.md#分組欄與系列欄上的條件) 的「分組欄與系列欄上的條件」。此元件只標示，不篩選 `rows`
- **顏色**使用 Chart.js 預設的色盤，填色為半透明。圓餅類與只有一個 dataset 的 bar 依組上色，其他圖表依 dataset 上色。`colors` 指定的項目使用指定的顏色（見 [chart.md](../../topics/chart.md#顏色) 的「顏色」）。文字與格線取自主題的 `on-surface`，不透明度見同一處
- **刻度與提示依 dataset 的 `unit` 格式化**：`percent` 加上「%」，`duration` 為「時:分:秒」，`date` 為 `yyyy/mm/dd`，其餘最多兩位小數
- **軸上的值皆為整數時，刻度只取整數**：每一軸各自判斷，包括右側的軸與 scatter、bubble 的兩軸。例如數量的軸不出現 0.5
- **直的數值軸使用自訂的軸 `spacedLinear`**：此軸繼承 Chart.js 的 `linear`，刻度間距的下限較大（見 [design/chart.md](../../design/chart.md#尺寸與樣式) 的「尺寸與樣式」）。此元件於 Chart.js 載入後登記此軸。橫的軸與 radar、polarArea 的軸使用 Chart.js 原本的軸
- **bubble 的半徑換算為固定範圍的像素**：依資料中半徑欄位的最小值與最大值等比換算，範圍見 [design/chart.md](../../design/chart.md#尺寸與樣式) 的「尺寸與樣式」。提示中顯示原本的值
- **圖例的位置依圖表的比例**：圖表寬而矮時置於右側，否則置於上方，比例的門檻見同一處。圖表改變大小時重新判斷
- **圖例的文字依 Chart.js 分給圖例的寬度換行**：每次排版時，此元件於產生圖例時量測文字並分成多行，交給 Chart.js 畫出。中日韓文字可於任何字之間斷開，其他文字優先於空白處斷開。色塊的大小見 [design/chart.md](../../design/chart.md#尺寸與樣式) 的「尺寸與樣式」
- **橫向長條圖的分組名稱依軸的寬度換行**：規則與圖例相同，於 Chart.js 量測名稱的大小之前換行
- **scatter 與 bubble 的圖例**與分組類的圖表使用同一種寫法，列出各 dataset
- **高度隨所在的容器**，此元件不設最小高度。`ChartPage` 指定這個容器的高度。直接使用此元件時，由外層指定高度
- 設定的組成位於同一資料夾的 `chartConfig.ts`，為純函數
