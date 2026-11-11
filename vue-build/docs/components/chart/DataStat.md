# DataStat

以文字顯示 `type` 為 `stat` 的圖表：每一組的每一個數值為一格（宣告方式見 [chart.md](../../topics/chart.md)，外觀見 [design/chart.md](../../design/chart.md#文字統計) 的「文字統計」）。不使用 Chart.js。

## Usage

頁面通常使用 [ChartPage](../page/ChartPage.md)。`chart` 的 `type` 為 `stat` 時，`ChartPage` 改用此元件。直接使用此元件的方式與 [DataChart](DataChart.md) 相同。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `chart` | `ChartDefinition<Row>` | **必填**，`defineChart` 的回傳值，`type` 須為 `stat` |
| `rows` | `readonly Row[]` | **必填**，要統計的列，通常為 `useListPage` 的 `rows` |
| `filters` | `Filters?` | 該表的篩選條件。分組欄上的條件以高光標示，省略時不標示 |
| `clickable` | `boolean?` | 預設 `true`。`false` 時點擊沒有反應，不發出事件 |

## Emits

| 事件 | 參數 | 說明 |
| --- | --- | --- |
| `group` | `group: ChartGroupData<Row>`、`series: null` | 點擊一格，與 `DataChart` 點擊一組相同。stat 沒有系列，`series` 一律為 `null` |

- **沒有 `group` 時不發出事件**，沒有列的組也不發出

## 備註

- **每一格的內容**：
  - 有 `group` 時，名稱為組的名稱。另有多個數值時，名稱下方以小字顯示數值的 `label`
  - 沒有 `group` 時，名稱為數值的 `label`
  - 數字與單位依 dataset 的 `unit`、`sign` 與 `suffix` 格式化，與 `DataChart` 的刻度使用同一個函數。沒有值時顯示「—」
- **格的大小**：
  - 位於 dashboard 中時，以 dashboard 的格子換算
  - 不在 dashboard 中時，此元件量測自身的寬度，依 `useCompactLayout()` 選用手機或電腦的格數，換算一格的大小
  - 外圍的留白由外層負責，並以 CSS 變數 `--data-stat-inset` 告知此元件。`ChartPage` 已指定這個變數，位於有外框的面板中時為 0
  - 格寬另扣除面板與螢幕的距離（`--dashboard-panel-inset`）
- **所在的面板在手機上不貼齊螢幕**：此元件呼叫 `useInsetPanel()`（見 [DashboardPanel](../panel/DashboardPanel.md)）
- **位於有外框的面板中時，格子以面板的外框為框**：此元件以 `usePanelBordered()` 讀取外框狀態（見 [DashboardPanel](../panel/DashboardPanel.md)）。格子省略自己的外框與圓角，只保留左側的色塊，並靠左排列。展開的面板沒有外框，格子照常有外框
- **左側色塊的顏色**與 `DataChart` 使用同一個色盤，同樣依 `colors` 指定：有 `group` 時依組，沒有 `group` 時依數值
- **數字的顏色**：`textColor` 的色名以 `text-vuesheet-*` class 套上，數字與單位同色
- **高光**：分組欄上有條件時，沒被選的組調淡，判斷方式與 `DataChart` 相同
- **高度隨內容**，不使用 `cqh`。格數較多時，由外層捲動
