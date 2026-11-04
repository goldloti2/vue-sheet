# 圖表（Chart）

以一張表的列畫成一張圖表：宣告的方式、輸入的規則、計算的方式，以及點擊在儀表板中的行為。使用者看到的外觀與操作見 [design/chart.md](../design/chart.md)。

> **標記**：沒有標記表示已實作。🔶 為部分實作，🔲 為尚未實作。詳細進度見 [ROADMAP.md](../../../ROADMAP.md)。

---

## 概要

- **以 Chart.js 繪製**：載入 `chart.js/auto`，支援 Chart.js 的全部圖種。框架自行包裝。Chart.js 於圖表元件掛載時才載入，沒有圖表的頁面不下載
- **一頁一張圖表**：可單獨成頁，也可置於儀表板的面板或頁籤頁的頁籤
- **資料來自 `useListPage` 的 `rows`**：搜尋、篩選與 `scope` 照常生效。分組欄與系列欄上的條件除外，見「分組欄與系列欄上的條件」
- **圖表的種類由設計者固定**：使用者只能點擊圖表、搜尋與篩選

---

## 流程

| 步驟 | 負責 | 內容 |
| --- | --- | --- |
| 1 | 頁面 | 以 `defineChart(schema, {…})` 宣告圖表，只執行一次。以 `useListPage` 取得 `rows` 與 `filters`，`ignoreFilter` 傳入圖表的 `filterKeys` |
| 2 | `defineChart` | 於開發模式下檢查輸入，回傳 `type`、`stacked`、`horizontal`、`groupKey`、`seriesKey`、`filterKeys`、`colors` 與 `compute` |
| 3 | [`ChartPage`](../components/page/ChartPage.md) | 整頁層級的事：載入狀態、錯誤、高度、點擊後的處理。範本為 `template/pages/chart.vue` |
| 4-1 | [`DataChart`](../components/chart/DataChart.md) | 以 `computed` 執行 `compute(rows)`，依 `filters` 標示高光，套上顏色後交給 Chart.js。資料改變時更新圖表，卸載時銷毀 Chart.js 的實例 |
| 4-2 | [`DataStat`](../components/chart/DataStat.md) | 只用於 stat：同樣執行 `compute(rows)` 並標示高光，以文字顯示，不使用 Chart.js |

分工與 view 相同：`defineView` 準備，`DataList` 以每一列執行（見 [DataList](../components/list/DataList.md#view)）。

**`compute(rows)` 的結果**依圖表分為兩種，皆不含色值。`DataChart` 與 `DataStat` 依目前的主題套上顏色。stat 的 `textColor` 只是色名，由 `DataStat` 換成目前主題的色值。

分組類（`kind: 'category'`）：
- `labels`：各組的名稱，包含「(空白)」與「其他」
- `datasets`：每個 dataset 為一個數值，有系列時為一個數值的一個系列
  - `data` 與 `labels` 一一對應，`null` 表示留空
  - `unit` 為 `number`、`duration`、`percent` 或 `date`，供刻度與提示格式化。duration 的值為秒數
  - 數值指定了 `type`、`axis`，或 stat 的 `sign`、`suffix`、`textColor` 時一併帶上
  - 有系列時，`series` 為該 dataset 所屬系列於 `series` 中的索引
- `groups`：與 `labels` 一一對應。`rows` 為該組的列，依 `rows` 原本的順序
- `groups` 的 `filter` 為選取該組的篩選條件。無法以一個條件表示時為 `null`，例如 date 或 number 分組合併的「其他」
- `groups` 與各 dataset 皆帶有 `colorKey`，為該項於 `colors` 中的名稱（見「指定顏色」）
- `series`：各系列的 `rows` 與 `filter`，形狀與 `groups` 相同。沒有系列時為空陣列
- stat 沒有 `group` 時，全部的列為一組：`labels` 只有一個空字串，該組的 `filter` 為 `null`

逐列類（`kind: 'point'`，scatter 與 bubble）：
- `datasets`：沒有 `series` 時一個，有 `series` 時每組一個。沒有任何點的組不列入
- 有 `series` 時，結果的 `series` 為各組，dataset 的 `series` 為所屬的組於其中的索引
- 每個點為 `{ x, y, r, row }`。date 的值為毫秒，duration 的值為秒數。x 或 y 為空的列不畫出，bubble 另略過半徑為空的列
- `xUnit`、`yUnit` 為兩軸的單位

---

## 宣告

- **`defineChart(schema, input)` 宣告於頁面**，與 `defineView` 相同。實作於 `schema/chart.ts`
- **`input` 為一般物件**：可填的項目依 `type` 而定，由 TypeScript 型別檢查。欄位名稱打錯、某種圖表不支援的項目，皆於撰寫時報錯
- **型別檢查不到的規則，於開發模式下以 console 警告**：
  - 欄位不存在
  - 欄位的類型不能擔任該角色，例如 text 欄位作為分組
  - date 分組未指定 `unit`
  - 分組欄或系列欄未列於 `searchable`。點擊寫入這些欄的條件只用於高光，不篩選列，也不顯示於篩選抽屜
  - duration 的數值指定了 `suffix`

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
| `limit` | 只顯示數值最大的前 N 組，其餘合併為「其他」。只用於 bar、圓餅類與 stat | 圓餅類 5 組，bar 與 stat 全部 |
| `excludeBlank` | 分組欄為空的列不列入圖表，百分比的分母也不包含這些列 | 否，保留為「(空白)」一組 |

### 數值（`values`）

| 項目 | 說明 | 預設 |
| --- | --- | --- |
| `stat` | count、sum、avg、min、max，或自訂的函數 | 必填 |
| `key` | 計算的欄位。count 與函數不可指定，其餘必填 | — |
| `percent` | 以百分比顯示，只用於 count 與 sum。boolean 的 sum 為「是」的數量 | 否 |
| `unit` | 函數回傳的值的單位：`number`、`duration`（秒數）、`percent` 或 `date`（毫秒）。只用於函數 | `number` |
| `label` | 圖例的文字。`stat` 為函數時必填 | count 為「數量」，其餘例如「價格的平均」。boolean 的 sum 為「已買為『是』的數量」，加上 `percent` 時為「比例」 |
| `type` | 改畫成 line，用於 bar 與 line 的混合圖 | 與圖表相同 |
| `axis` | 使用左軸或右軸，用於 bar 與 line | 左軸 |
| `sign` | 正數前方加「+」，只用於 stat | 否 |
| `suffix` | 數字後方的單位，取代百分比的「%」，只用於 stat。duration 不適用 | 無，百分比為「%」 |
| `textColor` | 數字的顏色，只用於 stat。可為固定的色名，或以數值為參數、回傳色名的函數。回傳 `undefined` 時為一般的文字顏色 | 一般的文字顏色 |

- **`textColor` 的色名**與條件式格式相同：`red`、`orange`、`yellow`、`green`、`blue`、`purple`、`grey`，色值隨深淺色主題切換（見 [FormattedValue](../components/view/FormattedValue.md)）
- 函數的參數為該格的值，沒有值時為 `null`

自訂的統計（`stat` 為函數）：
- **第一個參數為一組的列**，回傳該組的值。沒有值時回傳 `null`，圖表在此留空
- **第二個參數為 `{ index, groups }`**：`groups` 為各組的列，依圖上的順序。`index` 為此組於 `groups` 中的位置。須比較其他組時使用，例如與前一組相比的增長、累計
- **有系列時**，兩個參數皆只含屬於該系列的列。「其他」的參數為合併後的全部列
- **依數值排序與 `limit`** 使用函數回傳的值，與內建的統計相同。此時圖上的順序尚未決定，`index` 與 `groups` 依分組本身的順序
- **參數的列已套用搜尋、篩選與 `scope`**。例如比較本週與上週時，日期的篩選可能使上週的列不在參數中
- 須以百分比顯示時，函數回傳百分比的數字，`unit` 指定為 `percent`

### 各種圖表

| 種類 | 可填的項目 |
| --- | --- |
| bar | `group`、`series`、`values`、`stacked`、`horizontal` |
| line | `group`、`series`、`values`、`stacked` |
| pie、doughnut | `group`、`values`、`series`。多個數值或 `series` 畫成同心圓，兩者擇一，各圈的分組相同 |
| polarArea | `group`，以及一個數值 |
| radar | `group` 為各軸，`series` 為各條線，`values` |
| scatter | `x`、`y`、`series` |
| bubble | `x`、`y`、`r`、`series` |
| stat | `group`（可省略）、`values`。以文字顯示每一組的每一個數值 |

- `series` 為第二層分組，每一組成為一個 dataset。項目與 `group` 相同，但沒有 `limit`
- scatter 與 bubble 的 `series` 依一欄將點分組上色
- 每一種圖表皆可指定 `colors`，見「顏色」
- stat 沒有 `group` 時，全部的列為一組，每個數值一格。stat 沒有 `series`

---

## 計算的規則

- **空值自成「(空白)」一組**：依分組本身排序時排在最後。依數值排序時，與其他組一同比較。設定 `excludeBlank` 時，這些列不列入圖表
- **select 與 boolean 的組**：select 依 `options` 的順序列出每個選項，沒有列的選項也列出。`options` 以外的值排在其後，排序的規則與列表相同。boolean 一律列出「否」與「是」
- **date 的區間**：範圍從資料中最早的一段到最晚的一段，沒有列的區間也列出。名稱為 `2026`、`2026/01` 或 `2026/01/05`
- **number 與 duration 的區間**：
  - 在最小值與最大值之間等分，最大值歸入最後一段。最小值等於最大值時只有一段
  - 名稱為「下限 ～ 上限」。number 最多保留兩位小數，duration 為「時:分:秒」
  - 恰好落在分界的值歸入上面那一段。每一段的篩選條件為「≥ 下限且 < 上限」，最後一段不設上限，因此篩出的列與圖上該段的列相同
- **沒有列的組**：count 與 sum 為 0，avg、min、max 留空
- **百分比的分母**：
  - 數值為 boolean 時，為同一組的列數，即每組中「是」的比例
  - 有系列且堆疊時，為同一組中各系列的總和，即 100% 堆疊
  - 其他情況，為同一個 dataset 中各組的總和
- **「其他」**：依第一個數值選出最大的前 N 組，數值相同時保留排序在前的組。其餘合併為「其他」，排在最後

---

## 顏色

- **色盤**：依序為 `blue`、`red`、`orange`、`yellow`、`green`、`purple`、`grey`，七色輪流使用。色名與條件式格式相同，色值與 Chart.js 的 Colors plugin 相同。深淺色主題使用相同的色盤
- **填色為半透明**，邊線、線條與點的外框為原色。radar 的面積彼此重疊，填色較淡。不透明度見 [design/chart.md](../design/chart.md#尺寸與樣式) 的「尺寸與樣式」
- **依組上色**：圓餅類、只有一個 dataset 的 bar，以及有 `group` 的 stat。圖例列出各組
- **依 dataset 上色**：其他的 bar、line、radar、scatter、bubble，以及沒有 `group` 的 stat。圖例列出各 dataset，只有一個 dataset 時不顯示圖例。stat 沒有圖例
- **切換深淺色主題時**，文字、格線與扇形之間的分隔線改為新主題的顏色，無須重新計算
- **沒被選的部分調淡**，見「分組欄與系列欄上的條件」

### 指定顏色（`colors`）

`colors` 以名稱對應色名，例如「完成」為 `green`、「未完成」為 `orange`：

- **名稱為圖上顯示的名稱**：依組上色時為組名。依 dataset 上色時為圖例上 dataset 的名稱，即系列的名稱或數值的 `label`
- **「(空白)」與「其他」的名稱為 `chartBlank` 與 `chartOthers`**：與顯示的文字無關，因此不與名為「其他」的選項混淆。有多個數值又有系列時，dataset 的名稱為「數值的名稱（系列的名稱）」，系列為「(空白)」時寫成「數值的名稱（chartBlank）」
- **數值的名稱未指定 `label` 時由框架產生**，例如「價格的平均」。須指定顏色的數值，宜一併指定 `label`
- **未指定的項目依序輪流**：從前一個項目的顏色之後接續，跳過已指定給其他項目的顏色。七色皆已指定時不跳過
- **名稱不在圖上時**，該項指定不生效
- stat 數字的顏色由 `textColor` 指定，與 `colors` 無關。`textColor` 使用條件式格式的色值，`colors` 使用圖表的色盤

---

## 分組欄與系列欄上的條件

- **圖表忽略自己分組欄與系列欄上的篩選條件**：不論單獨成頁、置於頁籤頁或儀表板，皆仍畫出全部的組與系列
- **其他欄位的條件、搜尋與 `scope` 照常生效**
- **忽略的方式**：頁面將 `defineChart` 回傳的 `filterKeys` 傳入 `useListPage` 的 `ignoreFilter`，`rows` 便不套用這些欄的條件。`filters` 另外以 `v-model:filters` 傳入 `ChartPage`，供圖表標示高光與寫入條件
- **哪些組被選，由該組的列判斷**：一組有列，且每一列皆符合分組欄的條件時，該組被選。勾選多個值時標示多組。沒有列的組，例如沒有資料的區間，不標示
- **哪些系列被選，判斷方式與組相同**：一個系列有列，且每一列皆符合系列欄的條件時，該系列的 dataset 被選
- **分組欄有條件時，沒被選的組調淡**：長條、扇形與折線上的點皆調淡，圖例中的組同樣調淡
- **系列欄有條件時，沒被選的系列調淡**：整個 dataset 調淡，圖例中的系列同樣調淡
- **兩欄皆有條件時**，一個長條或一個點只在組與系列皆被選時照常顯示
- 條件可來自篩選抽屜、點擊圖例，或儀表板中點擊圖表

---

## 點擊

點擊圖表與圖例寫入的條件，與篩選抽屜為同一份條件。`ChartPage` 以 `v-model:filters` 寫回 `useListPage` 的 `filters`。

`ChartPage` 的 `clickable` 為 `false` 時，點擊圖表與圖例皆沒有反應，以下的規則皆不適用。滑鼠移上時的提示照常顯示。

**點擊圖表**：
- **一般情況**：進入該組第一列的詳細頁，上一列、下一列只在該組的列之間切換
- **儀表板的面板中**：寫入分組欄的條件，只選這一組。有系列時，一併寫入該長條或該點所屬系列的條件。同表的面板隨之改變，以接線連到這些面板的其他面板也隨之改變（見 [DashboardPage](../components/panel/DashboardPage.md) 的「連動」）
- **再點擊同一組時**：分組欄與系列欄皆已為這些條件，因此移除這些條件
- **條件無法以一個條件表示的組**，例如區間合併的「其他」，在儀表板中點擊時不寫入
- **scatter 與 bubble**：一律進入該點的那一列，沒有上一列與下一列
- **stat**：點擊一格與點擊一組相同。沒有 `group` 時不能點擊

**點擊圖例**（各處相同）：
- **圖例的一項為一組或一個系列時**，切換該項的值是否勾選，與篩選抽屜的勾選相同，可複選。「其他」一次切換合併進來的各值
- **區間只能選一段**：點擊另一段時取代原本的區間，再點擊同一段時移除
- **圖例的一項為沒有系列的 dataset 時**，例如同一張圖的多個數值，照 Chart.js 的預設隱藏或顯示該 dataset

寫入的條件：

| 點擊的組 | 寫入的條件 |
| --- | --- |
| select、boolean 的一組 | 該欄的 `values` |
| 「(空白)」 | `values` 為 `null` |
| 「其他」 | 合併進來的各組的 `values` |
| date、number、duration 的區間 | 該欄的 `segment`：`min` 為下限，`below` 為不含的上限。date 的上限為下一段的開始，number 與 duration 的最後一段沒有上限 |

- **區間只以文字顯示於篩選抽屜**：`segment` 不填入「最小」「最大」的輸入框。第一層該欄位的小字為「≥ 0、< 20」，第二層的輸入框上方顯示「圖表選取：≥ 0、< 20」。使用者輸入範圍後，以輸入的範圍取代 `segment`
- **放大鏡的生效中標示**涵蓋圖表寫入的條件（見 [search.md](search.md)）

---

## 不支援

- 雙向長條圖，例如人口金字塔
- 內外圈分類不同的同心圓，即旭日圖
