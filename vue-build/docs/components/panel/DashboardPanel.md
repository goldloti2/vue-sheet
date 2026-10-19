# DashboardPanel

[DashboardPage](DashboardPage.md) 中的一個面板：外框、小外殼（標題列與展開鈕）與關注點，並控制面板內容的各項登記何時生效。必須放在 `DashboardPage` 之內，否則拋出錯誤。

面板中的頁面不需修改：列表的搜尋自動加入 dashboard 共用的那一份，詳細頁的 id 改取自互動的選取，FAB 與 App Bar 的動作由 dashboard 決定何時顯示（見下方「嵌入既有頁面」）。

## Usage

範本見 `template/pages/dashboard.vue`。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `name` | `string` | **必填**，對應 `DashboardPage` 的 `layout`；同一頁中不可重複 |
| `title` | `string?` | 小外殼上的標題，展開時亦為 App Bar 的標題 |
| `frame` | `boolean?` | 預設 `true`。`false` 時沒有小外殼，不能成為關注點，也不能展開，適合圖表等純顯示的面板 |
| `table` | `TableKey?` | 面板內容所屬的表；篩選抽屜開啟時先停在關注面板的這張表 |
| `via` | `string?` | 互動經由哪個 ref 欄位連動：子表的列表面板為自己的欄位，父表的詳細面板為子表的欄位。不給時，子表的列表任一指向所選父表的欄位符合即列出，父表的詳細面板取第一個。不是任何一張表的 ref 欄位時，開發模式下於 console 警告 |

## Slots

| slot | 說明 |
| --- | --- |
| `default` | 面板的內容 |

## 嵌入既有頁面

既有的列表頁與詳細頁以元件 import 後直接放入面板，其 `<route>` 區塊不生效。各項差異由框架處理：

| 頁面所做的事 | 於面板中 |
| --- | --- |
| 詳細頁以 `useRecordPage` 自網址取得 id | 改取 `useDashboardSelection()` 的互動選取，不讀網址 |
| 列表頁的 `useListPage` 自行登記搜尋、篩選與排序 | 不自行登記，改用 dashboard 共用的搜尋字串，並將自己的表交由 dashboard 統一登記 |
| 列表頁取得的 `rows` | 依序經過互動（依所選的父列篩出子列）、篩選、搜尋 |
| 列表的每一列以 `to` 換頁 | 開啟互動時改為選取：`ListPage` 交給每一列的 `props` 另含 `current`、`pickable` 與 `pick`，選取的那一列另有標示 |
| `useAppBarActions`、FAB、`DetailPage` 的上下一筆與左右滑動 | 見 [DashboardPage](DashboardPage.md) 的「App Bar、FAB 與搜尋」與「展開」 |
| 刪除當前那一筆後自動離開 | 僅於網址為 `/表/id` 時觸發，dashboard 中不觸發 |
| 頁面中的換頁（例如前往編輯頁） | 照常換頁，離開 dashboard；此類動作僅於展開時出現 |

- **列表順序的發布**：`ListPage` 照常發布該表目前的列表順序；自 dashboard 進入詳細頁時，上下一筆依面板中的順序（例如僅於所選父列的子列之間切換）
- **含 `TabPage` 的頁面不能放入**：將頁籤以外的部分拆成 `_ref/` 中的單純列表，由頁籤頁與 dashboard 各自使用；放入 dashboard 時不給頁籤的條件（例如 `status`）即為整張表
- **App Bar 的標題由 `title` 給定**：以元件 import 的頁面讀不到自己的 `meta.title`

## 備註

- **點擊面板的任何地方即成為關注點**，以主色的外框標示；預設的關注點為第一個有小外殼的面板。長按時關注點先移到此面板，再進入多選
- **小外殼除右側的展開鈕外不放動作**
- **向內 provide 三件事**：是否為當前面板（與 `TabPage` 的頁籤同一套機制，`usePanelActive`）、是否已展開（`usePanelFullPage`，不在面板中時一律為 `true`），以及互動經由的 ref 欄位（`via`）
- **登記只在關注面板生效**：篩選抽屜、列表順序的發布等跟著關注點
- **FAB、詳細頁的上下一筆與左右滑動只在展開時啟用**
- **內容區為名為 `dashboard-panel` 的 container**，不含小外殼。內容元件以 `@container dashboard-panel (width < 200px)` 於 3 格以下時切換窄版：
  - deck：只顯示標題與副標，上下排列
  - card：省略第 3 層
  - 詳細頁的欄位：名稱與值改為上下兩行
  - 動作列：文字按鈕改為圖示，靠左，放不下即換行

  一般頁面沒有這個 container，不會觸發。table、gallery、圖表與 profile 不另外處理，table 於面板內橫向捲動；form 尚未確認是否需要調整。`200px` 於各元件各寫一次，調整門檻時須一併修改
- **手機的自動排版**：量測小外殼與內容的高度，換算為格數（無條件進位，最多 8 格），內容變動時（例如搜尋後列數變少）重新排版
- **另一個面板在多選時**，於捕獲階段攔下並調暗，內容元件不需知道自己被鎖定，面板自己的捲動不受影響
- **選取改變時的轉場**：轉場進行中面板才帶有 `view-transition-name`，平時不帶
