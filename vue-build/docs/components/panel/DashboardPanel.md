# DashboardPanel

[DashboardPage](DashboardPage.md) 中的一個面板：外框、小外殼（標題列與展開鈕）與關注點，並控制面板內容的各項登記何時生效。必須放在 `DashboardPage` 之內，否則拋出錯誤。

面板中的頁面不需修改：列表的搜尋自動加入 dashboard 共用的那一份，詳細頁的 id 改取自互動的選取，FAB 與 App Bar 的動作由 dashboard 決定何時顯示（見 [dashboard.md](../../dashboard.md) 的「嵌入既有頁面」）。

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

## 備註

- **點擊面板的任何地方即成為關注點**，以主色的外框標示；預設的關注點為第一個有小外殼的面板。長按時關注點先移到此面板，再進入多選
- **登記只在關注面板生效**：與 `TabPage` 的頁籤同一套機制（`usePanelActive`），篩選抽屜、列表順序的發布等跟著關注點
- **FAB、詳細頁的上下一筆與左右滑動只在展開時啟用**（`usePanelFullPage`）
- **內容區為名為 `dashboard-panel` 的 container**，不含小外殼。內容元件以 `@container dashboard-panel (width < 200px)` 於 3 格以下時切換窄版：
  - deck：只顯示標題與副標，上下排列
  - card：省略第 3 層
  - 詳細頁的欄位：名稱與值改為上下兩行
  - 動作列：文字按鈕改為圖示，靠左，放不下即換行

  一般頁面沒有這個 container，不會觸發
- **手機的自動排版**：量測小外殼與內容的高度，換算為格數（最多 8 格），內容變動時重新排版
- **另一個面板在多選時**，於捕獲階段攔下點擊與長按並調暗；不使用 `inert`，面板自己的捲動才不受影響
- **選取改變時的轉場**：轉場進行中面板才帶有 `view-transition-name`，平時不帶，換頁時面板才會隨整個畫面一起滑動
