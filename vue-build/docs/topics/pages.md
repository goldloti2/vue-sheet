# 頁面的運作

頁面在執行時與外殼、導覽的配合方式，包括：
- 外殼的各部位由誰負責
- 多選與頁籤的機制
- KeepAlive 帶來的規則
- 換頁動畫
- 表單層
- 完成動作後的離開方式
- 離開表單前的確認

各部位的外觀與用途見 [design/README.md](../design/README.md)，動作本身見 [actions.md](actions.md)。

> **標記**：沒有標記表示已實作。🔶 為部分實作，🔲 為尚未實作。詳細進度見 [ROADMAP.md](../../../ROADMAP.md)。

---

## 畫面的外殼

外殼由 `AppShell` 繪製。頁面不直接放置這些部位，而是把內容交給 `AppShell`：

| 部位 | 元件或來源 | 說明 |
| --- | --- | --- |
| **App Bar** | `AppShell` | 標題取自 `route.meta.title`，沒有時使用 `config/app.ts` 的 App 名稱。以 `useAppBarHeading()` 登記時，改以登記的標題與返回動作取代路由的標題與 ← 按鈕，用於儀表板的展開 |
| **左側圖示** | `AppShell` | 有 App 內的上一頁時為返回箭頭，否則為漢堡選單 |
| **App Bar 的動作** | `useAppBarActions()` | 右側的圖示按鈕，三個以上收進「⋮」 |
| **搜尋按鈕、搜尋列** | `useListControls()` | 為獨立的一個按鈕，不收進「⋮」。多選時隱藏 |
| **篩選按鈕** | `useListControls()` | 位於搜尋輸入框內的最右側。有表可篩選時才出現 |
| **排序按鈕** | `useListControls()` | 表有提供 `sort` 且有可排序的欄位時才出現。多選時與搜尋一同隱藏 |
| **同步按鈕** | `AppShell` | 不屬於任何頁面 |
| **頁籤列** | `TabPage` | 畫在 `TabPage` 的最上方，捲動時固定於 App Bar 的下緣 |
| **內容區** | `pages/*.vue` | 換頁時左右滑動的即為此區 |
| **側邊欄** | [`NavDrawer`](../components/shell/NavDrawer.md) | 項目為 `config/navigation.ts` 的 `drawerSections`，電腦版另於最上方列出 `navItems`。「登出」在 `config/app.ts` 的 `authMethod` 不是 `'none'` 時出現 |
| **篩選、排序抽屜** | `AppShell` 與 `FilterPanel`、`SortPanel` | 抽屜本身屬於 `AppShell`，兩個面板只提供內容，一次顯示一種（見 [search.md](search.md)） |
| **FAB** | `PageFab` | 頁面或版型元件以 `fab` 交給 `PageFab` |
| **底部導覽列** | `config/navigation.ts` | 只有手機版有。項目為 `navItems`，最多 5 項。超過時只顯示前 5 項，開發模式下以 console 警告。電腦版的側邊欄也只列出前 5 項 |
| **snackbar** | `notify()` | 全 App 同時只有一則，例如 `notify('已推送')`、`notify('推送失敗', 'error')`。第二個參數為 Vuetify 的 color |
| **上一列、下一列的箭頭** | `RecordNav` | 由 `DetailPage` 放置 |

對話框（`ConfirmDialog`、`FieldsDialog`）與上述位置無關，一律覆蓋於畫面中央。表單層覆蓋整個畫面，見「表單層」。

- **左側圖示依目前的路由自動切換**為漢堡選單或返回箭頭：以 router 累計的導覽次數判斷是否確實有 App 內的上一頁，沒有時不顯示返回箭頭。電腦版沒有漢堡選單，頂層頁面不顯示左側圖示
- **頁面可以不使用外殼**：將 `definePage` 的 `meta.shell` 設為 `false`，App Bar、側邊欄與底部導覽列皆不顯示，整頁由頁面自行排版，例如登入頁 `pages/login.vue`
- **手機版的側邊欄開啟後浮在內容上**，點擊側邊欄以外的地方或換頁後收起（見 [NavDrawer](../components/shell/NavDrawer.md)）
- **電腦版沒有底部導覽列**：底部導覽列的頁面列於固定在左側的側邊欄，側邊欄可收合為圖示列（見 [NavDrawer](../components/shell/NavDrawer.md)）

---

## 多選與頁籤

- **選取的內容一有項目，即自動進入多選。清空即自動離開**。不另外保存一個 boolean
- **多選的出口為 App Bar 右上角的「取消」**：`useMultiSelect()` 自行登記退出的方式，按鈕的外觀與位置由 `AppShell` 決定，與放大鏡相同。「取消」固定於同步按鈕左側，不收進「⋮」
- **多選時，搜尋按鈕隱藏**：`AppShell` 依「是否登記了取消」判斷目前是否為多選
- **離開即取消選取**：
  - 換頁時清空選取。列表由 KeepAlive 快取，依 `onDeactivated` 判斷
  - 換頁籤時清空選取。頁籤的訊號來自所在的 `TabPage`（`useCurrentTab()`），因此同一張表的頁籤與各自一張表的面板使用同一條路徑
  - 頁面無須處理
- **頁籤列由 `TabPage` 畫在自己的最上方**，以 `position: sticky` 固定，因此捲動內容時不離開畫面（見 [TabPage](../components/panel/TabPage.md)）

---

## KeepAlive 的規則

列表頁與詳細頁皆由 `<KeepAlive :max="50">` 快取，key 為 `route.fullPath`。由此而來的規則：

- **`[id]` 頁面一律使用 `useRouteId()`**，不自行 `watch` `route.params.id`。一個實例終其一生只對應一個網址，路由參數對該實例而言是常數。拿掉 `:key` 時，`useRouteId()` 於開發模式下印出警告
- **快取改變時任其改變**：資料被刪除時，離開中的頁面顯示「找不到這一列」
- **每次進入都須重算的內容放在 `onActivated`**：同一個網址共用同一份實例，`setup` 不會重新執行
- **Teleport 出去的浮動元件自行處理進場與出場**：`PageFab`、`RecordNav` 送至 `body`，以 `onActivated`、`onDeactivated` 控制
- **列表載入中時，不以 `v-if` 整個替換列表**，改用 `PageState` 的 `spinner="linear"`。進度條加在內容上方，不取代內容
- **量測大小的元件，於 DOM 不在文件中時不量測**：KeepAlive 收起頁面時，`ResizeObserver` 回報的寬與高為 0。量測的元件以 `isConnected` 判斷，保留原本的值，例如 `DashboardPage` 的格子、`DashboardPanel` 的自動高度、`DataStat`、`DataTable` 的欄寬
- **在自己的框內捲動的元件，自行記錄捲動位置**：DOM 移出文件時，框內的捲動歸零。`DashboardPanel` 於捲動時記下位置，於 `onActivated` 還原
- **捲動位置由 router 另外記錄**：
  - 記錄為一份 `fullPath → scrollY`，於 `beforeEach` 儲存，於 `scrollBehavior` 還原，上限同樣為 50 個網址
  - 返回鍵優先使用瀏覽器記錄的 `savedPosition`
  - 沒看過的頁面，以及推入相同網址的導覽（儀表板的展開），回到頂端
  - 表單層的導覽不移動下方的頁面

被快取的頁面仍在全速運作：KeepAlive 的 `deactivate` 只搬移 DOM，不暫停元件的 effect。流入被快取頁面的資料只有兩種：路由參數（讀取一次即固定）與共用快取（任其改變）。

---

## 換頁動畫

換頁時以 View Transitions 截下換頁前後的畫面，再左右滑動。共用的函數位於 `composables/shell/viewTransition.ts`，換頁的流程位於 `router/index.ts`，CSS 位於 `App.vue`：

- **`beforeResolve` 開始動畫**：呼叫 `document.startViewTransition`。導覽等到舊畫面截好、update callback 被呼叫時才繼續。首次載入不播放動畫
- **`afterEach` 之後放行**：等 `nextTick`（新頁面的 DOM 已更新）後，才讓 update callback 結束，瀏覽器隨即截下新畫面。`scrollBehavior` 的捲動排在同一個 `nextTick` 之後的 microtask，早於截圖，因此新畫面已是捲好的位置
- **導覽失敗（被取消、被擋下）時略過動畫**。因重導而沒有執行 `afterEach` 的那一次，於下一次的 `beforeResolve` 略過
- **滑動的是整個畫面（`root`）的截圖**
- **外殼另外命名**：App Bar、左側抽屜、底部列、FAB、`RecordNav` 各有 `view-transition-name`，因此不在 `root` 的截圖中。舊的直接隱藏，新的不加動畫
- **表單層的動畫**：頁面大小的層開啟或關閉時，`<html>` 帶有 `data-layer-nav`，所有元素不另外命名，整個畫面一起滑動。對話框大小的層與離開失效格子的導覽不播放動畫
- **方向寫在 `<html>` 的 `data-dir`**：於 `afterEach` 寫入，CSS 於動畫開始時才讀取。同時寫入 `data-transition="page"`，與儀表板面板內的轉場（`data-transition="panel"`）區分，`root` 只在換頁時滑動
- **方向的判定**依下列順序，採用第一個符合的規則：
  1. 網址相同（儀表板的展開與縮回、表單層的開啟與關閉）：依瀏覽器歷史為前進或後退
  2. 兩端皆為導覽項目：依導覽項目的順序，往後為前進。順序為底部導覽列的各項，再接側邊欄各組的各項。兩處皆有的頁面以底部導覽列的位置為準
  3. 只有目的地為導覽項目：一律為後退
  4. 同一個路由切換 id，且兩列皆在列表發布的順序中：依兩列在列表中的先後
  5. 其他：依瀏覽器歷史為前進或後退。點選連結或動作為前進，返回鍵為後退
- **儀表板的展開與縮回**為網址相同的導覽，同樣經過上述流程。儀表板在 `afterEach` 中改變展開狀態，落在兩次截圖之間
- **瀏覽器不支援 View Transitions，或系統開啟「減少動態效果」時，不播放動畫**，直接切換
- **首次導覽完成後，於背景下載所有頁面的程式**：換頁時無須等待下載。下載失敗的頁面於換頁時再下載

---

## 表單層

表單不是路由頁面。新增、編輯與快速編輯皆為蓋在目前頁面上的一層，下方的頁面不離開。程式位於 `composables/shell/useFormLayers.ts` 與 `formLayerState.ts`，畫面由 [FormLayerHost](../components/shell/FormLayerHost.md) 繪製。

- **`openForm(table, options?)`**：開啟頁面大小的層。送出時回傳寫入後的列，取消時回傳 `null`。回傳時 history 已回到下方那一格。`options` 見 [FormLayerHost](../components/shell/FormLayerHost.md#openform-的選項)
- **`askFields`**：開啟對話框大小的層（見 [actions.md](actions.md#快速編輯對話框)）
- **`runStep`**：開啟流程的一步（見 [actions.md](actions.md#連續動作流程)）

**只存在記憶體中**：
- 表單沒有網址，只有 `openForm` 能開啟
- 重新整理與直接輸入網址都不會開啟表單
- 預設值與 `id` 由呼叫時傳入，不經過 `history.state` 或路由

**history**：
- 每層佔一格，網址不變，`history.state.formLayer` 記下層的 id、深度與開啟時的網址
- 標記只屬於記下的網址。`replace` 沿用目前這一格的 state，標記因此可能被帶到其他網址。網址不同時視為沒有標記（`formLayerState.ts` 的 `markerOf`）
- 開啟時保留這一格原有的 state，例如儀表板展開的面板
- 流程的第二步起取代上一步的格子

**堆疊只在 `router.afterEach` 中改變**：
- 導覽完成後，依目前這一格的標記比對堆疊，關閉已離開的層，並回傳結果
- 由最上層開始回傳結果
- 表單層的導覽不計入 `navigationCount`

**失效的格子**：
- 有標記、但記憶體中沒有這一層的格子為失效的格子。取消後按下一頁，以及重新整理後，都會走到這種格子
- 走到時以 `router.go` 跳回最近的有效位置，一律往回跳
- 失效的格子沒有元件，不會開啟表單，也不會寫入

**同步**：有任何層開啟時，持有 `holdSync()`（見 [store.md](store.md)）。

**一次送出只寫入一次**：層於送出後標記為 `closing`，之後的送出不寫入。覆蓋層擋下返回時，層不恢復送出，再次返回。

---

## 完成動作後的導覽

表單層送出後自動關閉，無須另外離開。

刪除等動作完成後須離開頁面時，使用 `@/router` 的 `leaveAfterAction(fallback)`，**不使用 `router.push`**。`leaveAfterAction` 執行瀏覽器的返回。沒有 App 內的上一頁時，才以 replace 前往 `fallback`，例如 `'/表名'`。

---

## 離開表單前的詢問

由 `useFormLayers` 的 `router.beforeEach` 統一處理：返回鍵、表單的取消與 ←、點選對話框外側，皆經過同一條路徑。取消按鈕本身不詢問。判斷的對象為這次導覽將關閉的層：

- **流程的第二步起一律詢問**，文字為「是否放棄未儲存的變更（包含之前的變更）？」
- **其他的層有改動時詢問**，文字為「有尚未儲存的變更，確定要離開嗎？」。是否有改動由 `useCreateForm`、`useEditForm` 判斷

以下情況不詢問：
- 開啟新的層與流程的下一步
- 送出後的關閉
- 子表單沒有改動時返回，即使外層有改動

前往其他頁面時，所有的層都會關閉，因此任一層符合上述條件即詢問。

使用者選擇不離開時，回傳 `false` 擋下導覽，層留在原處。瀏覽器的返回鍵被擋下時，vue-router 自行將歷史位置撥回。
