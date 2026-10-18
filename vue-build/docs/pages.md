# 頁面的運作

頁面在執行時如何與外殼、導覽配合：外殼的各部位由誰負責、多選與頁籤的機制、KeepAlive 帶來的規則、完成動作後如何離開，以及離開表單前的確認。各部位的外觀與用途見 [design/README.md](design/README.md)，動作本身見 [actions.md](actions.md)。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../ROADMAP.md)。

---

## 畫面的外殼

外殼由 `AppShell` 繪製，頁面不直接擺放這些部位，而是把內容交給它：

| 部位 | 元件／來源 | 說明 |
| --- | --- | --- |
| **App Bar** | `AppShell` | 標題取自 `route.meta.title`，沒有時使用 `config/app.ts` 的 App 名稱 |
| **左側圖示** | `AppShell` | 有 App 內的上一頁時為返回箭頭，否則為漢堡選單 |
| **App Bar 動作** | `useAppBarActions()` | 右側的圖示鈕，三顆以上收進「⋮」 |
| **搜尋鈕／搜尋列** | `useListControls()` | 為獨立的一顆，不收進「⋮」；多選時整顆讓位 |
| **篩選鈕** | 同上 | 位於搜尋輸入框內的最右側 |
| **排序鈕** | 同上 | 表有提供 `sort` 時才出現；多選時與搜尋一同讓位 |
| **同步鈕** | `AppShell` | 不屬於任何頁面 |
| **頁籤列** | `TabPage` | 登記為 App Bar 下方的 extension |
| **內容區** | `pages/*.vue` | 換頁時左右滑動的即為這一塊 |
| **側邊欄** | `AppShell` | 目前只有「登出」，於 `config/app.ts` 的 `authMethod` 不是 `'none'` 時出現 |
| **篩選／排序抽屜** | `AppShell` + `FilterPanel`／`SortPanel` | 抽屜本身屬於 `AppShell`，面板只放內容，一次顯示一種（見 [search.md](search.md)） |
| **FAB** | `PageFab` | 由頁面或版型元件的 `fab` 交給它 |
| **底部導覽列** | `config/navigation.ts` | 項目清單 |
| **底部動作列** | `useBottomActions()` | 表單頁時**暫時取代**底部導覽列 |
| **snackbar** | `notify()` | 全 App 同時只有一則，例如 `notify('已推送')`、`notify('推送失敗', 'error')`（第二個參數為 Vuetify 的 color） |
| **上下一筆箭頭** | `RecordNav` | 由 `DetailPage` 放置 |

對話框（`ConfirmDialog`、`FieldsDialog`）與上述位置無關，一律覆蓋於畫面中央。

- **左側圖示依目前的路由自動切換**為漢堡選單或返回箭頭：以 router 累計的導覽次數判斷是否真有 App 內的上一頁，沒有時不顯示返回箭頭
- **頁面可以不使用外殼**：將 `definePage` 的 `meta.shell` 設為 `false`，App Bar、側邊欄與底部導覽列皆不顯示，整頁由頁面自行排版（例如登入頁 `pages/login.vue`）
- 🔲 **電腦版的導覽待定**：是否改為常駐的側邊欄、底部導覽列是否於電腦上隱藏，待處理電腦版的體驗時再決定

---

## 多選與頁籤

- **選取的內容一有項目即自動進入多選，清空即自動離開**，不另外保存一個 boolean
- **多選的出口為 App Bar 右上的「取消」**：由 `useMultiSelect()` 自行登記「如何退出」，按鈕的外觀與位置由 `AppShell` 決定（與放大鏡相同），固定於同步鈕左側，且不收進「⋮」
- **多選時搜尋鈕讓位**：`AppShell` 依「是否登記了取消」判斷目前是否在多選
- **離開即取消選取**：換頁（列表由 KeepAlive 快取，依 `onDeactivated`）與換頁籤時皆會清空，頁面不需處理。頁籤的訊號來自 `TabPage` 登記給 `AppShell` 的那一份（`useCurrentTab()`），因此同一張表的頁籤與各自一張表的面板走同一條路徑
- **頁籤列由 `TabPage` 登記給 `AppShell` 的 extension**，因此不隨內容捲動

---

## KeepAlive 的規則

列表頁與詳細頁皆由 `<KeepAlive :max="50">` 快取，key 為 `route.fullPath`。由此而來的規則：

- **`[id]` 頁面一律使用 `useRouteId()`**，不自行 `watch` `route.params.id`。一個實例終其一生只對應一個網址，路由參數對它而言是常數；若跟著路由變化，離開中的頁面會讀到目的地的 id（拿掉 `:key` 時，`useRouteId()` 於開發模式下印出警告）
- **快取改變時任其改變**：資料確實被刪除時，離開中的頁面顯示「找不到這筆資料」是正確的
- **每次進入都須重算的東西放在 `onActivated`**，同一個網址共用同一份實例，`setup` 不會重新執行。兩種表單皆於 `onActivated` 重建表單並清除錯誤：新增頁的網址固定，不重建會停留在上次的內容，也讀不到新的預設值；編輯頁「離開後再回到同一筆」亦為同一份實例，不重置的話上次未儲存的輸入會留著，容易被誤存
- **Teleport 出去的浮動元件自行處理進出場**（`PageFab`、`RecordNav` 送至 `body`），以 `onActivated`／`onDeactivated` 控制，否則離開的頁面會把按鈕留在畫面上
- **列表載入中不以 `v-if` 整個替換列表**：`v-if="loading"` / `v-else` 會在每次背景重新整理（同步鈕會重新抓取所有已載入的表）時卸載重建，`GroupedList` 的展開狀態隨之消失。應使用 `PageState` 的 `spinner="linear"`，它將進度條加在內容上方，而非取代內容
- **捲動位置不是元件的狀態**，KeepAlive 無法保留（它保留的是元件，視窗的捲動位於元件之外）。router 另外記錄一份 `fullPath → scrollY`：於 `beforeEach` 儲存、於 `scrollBehavior` 還原，上限同樣為 50 筆。返回鍵優先使用瀏覽器記錄的 `savedPosition`，沒看過的頁面回到頂端

這些規則皆源自**被快取的頁面仍在全速運轉**，理由見 [architecture.md](architecture.md#設計取捨)。

---

## 完成動作後的導覽

新增、編輯、刪除完成後須離開頁面時，使用 `@/router` 的 `leaveAfterAction(fallback)`，**不使用 `router.push`**。它執行瀏覽器的返回；沒有 App 內的上一頁時，才 replace 至 `fallback`（例如 `'/表名'`）。

使用 `push` 會將已完成任務的表單頁留在歷史中，按上一頁又回到它：編輯頁會是舊的表單，刪除後的詳細頁更是已不存在的資料。

---

## 離開表單前先問

由 `useLeaveGuard` 的 `router.beforeEach` 統一處理：返回鍵、導覽列、修改網址、表單底部的取消皆經由同一條路徑（取消鈕本身不詢問，否則會問兩次）。是否詢問依以下兩點判斷：

- **[連續動作](actions.md#連續動作流程)的第二步起一律詢問**，文案為「是否放棄未儲存的變更（包含之前的變更）？」：這張表單可能尚未填寫任何內容，但前面的步驟已寫入資料，離開即等於整條流程收回
- **不在流程中時**，依表單是否有修改判斷（`useCreateForm`／`useEditForm` 登記的 `dirty` getter）

選擇不離開時回傳 `false` 擋下導覽，頁面留在原處；瀏覽器的返回鍵被擋下時，vue-router 會自行將歷史位置撥回。`runStep` 自己的導覽不會誤觸（它在 `replace` 完成後才登記），送出成功後的離開也不會被詢問（`resumeStep` 已清除等待中的步驟）。
