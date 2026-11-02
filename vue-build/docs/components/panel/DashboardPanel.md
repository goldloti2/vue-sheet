# DashboardPanel

[DashboardPage](DashboardPage.md) 中的一個面板：外框、小外殼（標題列與展開按鈕）與關注點，並控制面板內容的各項登記何時生效。此元件須置於 `DashboardPage` 之內，否則拋出錯誤。

面板中的頁面無須修改（見下方「嵌入既有頁面」）：
- 列表的搜尋、篩選與排序由面板統一登記，依 `shared` 加入 dashboard 共用的一份，或使用面板自己的一份
- 詳細頁的 id 改取自面板的輸入 `scope`
- FAB 與 App Bar 的動作由 dashboard 決定何時顯示

## Usage

範本見 `template/pages/dashboard.vue`。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `name` | `string` | **必填**，對應 `DashboardPage` 的 `layout`，也是連動中心中此面板的名稱。同一頁中不可重複 |
| `title` | `string?` | 小外殼上的標題，展開時也是 App Bar 的標題 |
| `frame` | `boolean?` | 預設 `true`。`false` 時沒有小外殼，不能成為關注點，也不能展開，適合圖表等純顯示的面板 |
| `shared` | `boolean?` | 預設 `false`。開啟時，面板中的列表加入 dashboard 共用的搜尋、篩選與排序，點擊圖表寫入條件。關閉時，面板有自己的一份，與一般頁面相同，點擊圖表進入詳細頁。建立後不可切換 |
| `table` | `TableKey?` | 面板內容所屬的表。篩選抽屜開啟時，先停在關注面板的這張表。輸入中有未指定 `within` 的 `childrenOf` 時必填，面板以這張表算出列 |
| `selects` | `boolean?` | 預設 `false`。開啟時點擊一列為選取，不換頁，並輸出 `selected`（見 [DashboardPage](DashboardPage.md) 的「連動」） |
| `scope` | `Link \| null?` | 面板內容的輸入，例如 `links.childrenOf(...)`、`links.selectionOf(...)`。面板中所有的列表只保留其中的列，未提供或沒有條件時不限制，沒有列時不列出任何列。面板中的詳細頁在剛好一列時顯示這一列，未提供、沒有條件、沒有列或多於一列時只顯示欄位名稱 |

## Slots

| slot | 說明 |
| --- | --- |
| `default` | 面板的內容 |

## 嵌入既有頁面

既有的列表頁與詳細頁以元件 import 後直接放入面板，頁面的 `<route>` 區塊不生效。各項差異由框架處理：

| 頁面所做的事 | 於面板中 |
| --- | --- |
| 詳細頁以 `useRecordPage` 從網址取得 id | 改取面板的 `scope` 中剛好一列的那一列，不讀網址 |
| 列表頁的 `useListPage` 自行登記搜尋、篩選與排序 | 不自行登記。開啟 `shared` 時加入 dashboard 共用的一份，關閉時加入此元件自己的一份。`search: false` 的列表照常不加入任何一份 |
| 列表頁取得的 `rows` | 依序經過面板的 `scope`、篩選、搜尋 |
| 列表的每一列以 `to` 換頁 | 面板開啟 `selects` 時改為選取：`ListPage` 交給每一列的 `props` 另含 `current`、`pickable` 與 `pick`，選取的那一列另有標示 |
| `ListPage` 與 `ChartPage` 顯示的列 | 輸出為面板的 `shown`。`ListPage` 另輸出選取的列 |
| `useAppBarActions`、FAB、`DetailPage` 的上一列與下一列、左右滑動 | 見 [DashboardPage](DashboardPage.md) 的「App Bar、FAB 與搜尋」與「展開」 |
| 刪除目前那一列後自動離開 | 只在網址為 `/表/id` 時觸發，dashboard 中不觸發 |
| 頁面中的換頁（例如前往編輯頁） | 照常換頁，離開 dashboard。這類動作只在展開時出現 |

- **列表順序的發布**：點擊一列時，`ListPage` 照常發布該表目前的列表順序。從 dashboard 進入詳細頁時，上一列、下一列依面板中的順序切換，例如只在所選父列的子列之間切換
- **面板中直接寫的內容**（不是 import 的頁面）依一般專案頁面的寫法。這類內容通常為純顯示，只放固定的內容，不接線。須要更多功能時，建議寫成獨立的頁面，再放入面板
- **含 `TabPage` 的頁面可以放入**：頁籤列固定於面板的上緣。`TabPage` 依面板的 `shared` 決定搜尋、篩選與排序：
  - 開啟時，`TabPage` 不另外建立，頁籤中的列表加入 dashboard 共用的一份
  - 關閉時，`TabPage` 建立自己的一份，頁籤之間共用，與單獨的頁籤頁相同。此面板為關注點時，App Bar 操作這一份
- **App Bar 的標題由 `title` 指定**：以元件 import 的頁面讀不到自己的 `meta.title`

## 備註

- **點擊面板的任何地方，該面板即成為關注點**，以外框標示（樣式見 [design/dashboard.md](../../design/dashboard.md)）。預設的關注點為第一個有小外殼的面板。長按時，關注點先移到此面板，再進入多選
- **小外殼除了右側的展開按鈕，不放其他動作**
- **此元件向內 provide 四件事**：
  - 是否為目前的面板（`usePanelActive`），與 `TabPage` 的頁籤使用同一套機制。外層的面板也須作用中
  - 是否已展開（`usePanelFullPage`）。不在面板中時一律為 `true`
  - 面板的輸入與寫入輸出的方式（`useDashboardPanel`），供 `ListPage`、`ChartPage`、`useListPage`、`useRecordPage` 與詳細頁的上一列、下一列讀取。不在面板中時為 `null`
  - 面板目前是否有外框（`usePanelBordered`），展開時沒有。不在面板中時一律為 `false`。內容可據此省略自己的外框與外圍留白，例如 [DataStat](../chart/DataStat.md) 的格子
- **此元件以 `relaySlot` 收下內容登記的兩個值**，交由 `DashboardPage` 決定是否登記於 App Bar：
  - 多選的出口
  - 內容自己的搜尋、篩選與排序，例如面板中的 `TabPage`。內容沒有登記時，關閉 `shared` 的面板改用此元件自己的一份
- **登記只在關注面板生效**：篩選抽屜等跟著關注點
- **FAB、詳細頁的上一列與下一列、左右滑動，只在展開時啟用**
- **內容區的 container 另含高度**：未展開時，`ChartPage` 以 `cqh` 依內容區的高度決定圖表的高度。展開時只含寬度，高度隨內容
- **未展開時，內容區把 `--v-layout-top` 設為 0**：內容在面板內捲動，以這個變數固定位置的元素（例如 `TabPage` 的頁籤列）因此固定於面板的上緣。展開時隨整頁捲動，沿用 App Bar 的高度
- **內容區為名為 `dashboard-panel` 的 container**，不含小外殼。面板為[窄面板](../../design/dashboard.md#窄面板)時，內容元件以 `@container dashboard-panel` 依寬度切換窄版：
  - deck：只顯示標題與副標，上下排列
  - card：省略第 3 層
  - 詳細頁的欄位：名稱與值改為上下兩行
  - 動作列：文字按鈕改為圖示，靠左，放不下即換行

  一般頁面沒有這個 container，不會觸發窄版。table、gallery、圖表與 profile 不另外處理，table 於面板內橫向捲動。form 是否須調整，尚未確認。門檻的寬度於各元件中各寫一次，調整時須一併修改
- **手機的自動排版**：此元件量測小外殼與內容的高度，換算為格數（無條件進位，上限見[尺寸](../../design/dashboard.md#尺寸)）。內容變動時重新排版，例如搜尋後列數變少
- **另一個面板在多選時**，此元件於捕獲階段攔下點擊並調暗。內容元件無須知道自己被鎖定，面板本身的捲動不受影響
- **選取改變時的轉場**：只在轉場進行中，面板才帶有 `view-transition-name`，平時不帶
