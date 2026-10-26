# 圖表（Chart）

以一張表的列畫成一張圖表：宣告的方式、輸入的規則、計算的方式，以及點擊與儀表板的互動。使用者看到的外觀與操作見 [design/chart.md](../design/chart.md)。

> **標記**：沒有標記表示已實作。🔶 為部分實作，🔲 為尚未實作。圖表預定於 v1.7 完成，詳細進度見 [ROADMAP.md](../../../ROADMAP.md)。

---

## 概要

- **以 Chart.js 繪製**：載入 `chart.js/auto`，支援 Chart.js 的全部圖種。框架自行包裝。🔲 圖表元件延遲載入，沒有圖表的頁面不下載 Chart.js
- **一頁一張圖表**：可單獨成頁，也可置於儀表板的面板或頁籤頁的頁籤
- **資料來自 `useListPage` 的 `rows`**：搜尋、篩選與 `scope` 照常生效
- **圖表的種類由設計者固定**：使用者只能點擊圖表、搜尋與篩選

---

## 流程 🔶

| 步驟 | 負責 | 內容 |
| --- | --- | --- |
| 1 | 頁面 | 以 `useListPage` 取得 `rows`。以 `defineChart(schema, {…})` 宣告圖表，只執行一次 |
| 2 | `defineChart` | 建立時查好欄位的定義與比較方式，並於開發模式下檢查輸入。回傳 `type` 與 `compute` 🔲 |
| 3 | `ChartPage` 🔲 | 整頁層級的事：載入狀態、錯誤、點擊後的處理 |
| 4 | `DataChart` 🔲 | 以 `computed` 執行 `compute(rows)`，套上顏色後交給 Chart.js。資料改變時更新圖表，卸載時銷毀 Chart.js 的實例 |

分工與 view 相同：`defineView` 準備，`DataList` 以每一列執行（見 [DataList](../components/list/DataList.md#view)）。

**`compute(rows)` 的結果** 🔲：
- `labels`：各組的名稱，包含「(空白)」與「其他」
- `datasets`：每個 dataset 為 series 的一組，或一個數值。`data` 與 `labels` 一一對應，`null` 表示留空。另可帶有 `type` 與 `axis`
- `groups`：與 `labels` 一一對應。`rows` 為該組的列，`filter` 為選取該組的篩選條件
- 結果不含顏色。`DataChart` 依目前的主題套上顏色
- scatter 與 bubble 沒有分組，`labels` 與 `groups` 為空。每個點帶有自己的那一列

---

## 宣告

- **`defineChart(schema, input)` 宣告於頁面**，與 `defineView` 相同。實作於 `schema/chart.ts`
- **`input` 為一般物件**：可填的項目依 `type` 而定，由 TypeScript 型別檢查。欄位名稱打錯、某種圖表不支援的項目，皆於撰寫時報錯
- **型別檢查不到的規則，於開發模式下以 console 警告**：
  - 欄位不存在
  - 欄位的類型不能擔任該角色，例如 text 欄位作為分組
  - date 分組未指定 `unit`
- 🔲 互動儀表板中，分組欄未列於 `searchable` 時，開發模式下以 console 警告

### 欄位的角色

| 角色 | 說明 | 可用的類型 |
| --- | --- | --- |
| **分組** | 依一欄將列分成幾組，每組為一塊扇形、一根長條或線上的一點 | select、boolean、date、number、duration |
| **數值** | 每組計算的值。一張圖可有多個數值 | number、duration、boolean。數量（count）無須欄位 |
| **座標** | scatter 與 bubble 不分組，每一列為一個點 | number、date、duration。bubble 的半徑限 number |

text、image、ref 不可分組。須依這些欄位分組時，改為宣告一個 select 型別的虛擬欄位。依價格的區間、尺寸的級距分組時，同樣以虛擬 select 欄位處理。

### 分組（`group`）

| 項目 | 說明 | 預設 |
| --- | --- | --- |
| `key` | 分組的欄位 | 必填 |
| `unit` | date 以年、月或日為一組 | date 必填 |
| `bins` | number、duration 在最小值與最大值之間等分的段數。最大值歸入最後一段 | 5 |
| `order` | `by` 為依分組本身或依數值排序，`direction` 為升序或降序。依分組本身時，比較的規則與列表的排序相同 | 依分組本身、升序 |
| `limit` | 只顯示數值最大的前 N 組，其餘合併為「其他」。只用於 bar 與圓餅類 | 圓餅類 5 組，bar 全部 |

### 數值（`values`）

| 項目 | 說明 | 預設 |
| --- | --- | --- |
| `stat` | count、sum、avg、min 或 max | 必填 |
| `key` | 計算的欄位。count 不可指定，其餘必填 | — |
| `percent` | 以百分比顯示，只用於 count 與 sum。boolean 的 sum 為「是」的數量 | 否 |
| `label` | 圖例的文字 | 由統計方式與欄位名稱組成 |
| `type` | 改畫成 line，用於 bar 與 line 的混合圖 | 與圖表相同 |
| `axis` | 使用左軸或右軸，用於 bar 與 line | 左軸 |

### 各種圖表

| 種類 | 可填的項目 |
| --- | --- |
| bar | `group`、`series`、`values`、`stacked`、`horizontal` |
| line | `group`、`series`、`values`、`stacked` |
| pie、doughnut | `group`、`values`、`series`。多個數值或 `series` 畫成同心圓，兩者擇一，各圈的分組相同 |
| polarArea | `group`，以及一個數值 |
| radar | `group` 為各軸，`series` 為各條線，`values` |
| scatter | `x`、`y`、`color` |
| bubble | `x`、`y`、`r`、`color` |

- `series` 為第二層分組，每一組成為一個 dataset。項目與 `group` 相同，但沒有 `limit`
- `color` 依一欄為各點上色，可用的類型與分組相同

---

## 計算的規則 🔲

- **空值自成「(空白)」一組**
- **date 與 number 分組中沒有列的區間**：count 與 sum 為 0，avg、min、max 留空。區間的範圍從資料中最早的一段到最晚的一段
- **百分比的分母**：
  - 沒有系列時，為全部的列
  - 有系列且堆疊時，為同一組的列，即 100% 堆疊
  - 數值為 boolean 時，為同一組的列，即每組中「是」的比例
- **「其他」**：依數值選出最大的前 N 組，其餘合併為「其他」，再依 `order` 排列

---

## 顏色 🔲

- **依共用色名輪流使用**：清單為 `plugins/vuetify.ts` 中的 `vuesheet-*`，色數隨清單的長度（見 [FormattedValue](../components/view/FormattedValue.md)）
- **圓餅類依組上色**，bar、line 與 radar 依 dataset 上色
- **切換深淺色主題時重新上色**，無須重新計算

---

## 點擊 🔲

- **一般情況**：進入該組第一列的詳細頁，上一列、下一列只在該組的列之間切換。scatter 與 bubble 進入該點的那一列
- **開啟互動的儀表板中**：點擊即寫入該表的篩選條件，與篩選抽屜為同一份條件。同表的面板與子表隨之改變（見 [DashboardPage](../components/panel/DashboardPage.md) 的「互動」）

寫入的條件：

| 點擊的組 | 寫入的條件 |
| --- | --- |
| select、boolean 的一組 | 該欄的 `values` |
| 「(空白)」 | `values` 為 `null` |
| 「其他」 | 合併進來的各組的 `values` |
| date、number 的區間 | 該欄的 `min`、`max` |

- **圖表忽略自己分組欄上的條件**：仍畫出全部的組，被選的組加上高光，其他組調淡
- **哪些組被選，由篩選條件推算**：從篩選抽屜設定的條件也同樣標示。勾選多個值時標示多組。date 與 number 的區間，範圍完全落在條件之內的才標示
- **放大鏡的主色標示**涵蓋圖表寫入的條件（見 [search.md](search.md)）

---

## 不支援

- 雙向長條圖，例如人口金字塔
- 內外圈分類不同的同心圓，即旭日圖
