# 前端架構

程式碼怎麼分、頁面之間怎麼接力：模組結構、KeepAlive 的規則、動作完成後的導覽、離開表單前的確認。動作本身（含連續動作與快速編輯對話框）見 [actions.md](actions.md)。

> **前置**：先看過 [schema.md](schema.md) 會比較好懂（這裡常提到 schema 與 row 上的 getter）。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../ROADMAP.md)。

---

## 模組化的範圍

模組化指的是**共用同一套外觀元件與資料存取邏輯**，不是自動產生整頁 UI。

```
[共用元件庫]  [Composables 資料存取]  [頁面範本]
        ↘            ↓            ↙
              [手寫頁面 pages/*.vue]
                       ↓
         [檔案式路由：自動產生/刪除路由]
```

每張表的顯示方式差異大，還有跨表組合的頁面，所以**頁面仍然手寫**；重複的部分靠元件庫、composables、頁面範本壓低。新增或刪除頁面只要動 `pages/` 底下的檔案，路由自動跟著變。

---

## 資料夾

```
src/
  components/ui/     共用元件庫，用法見 docs/components/
    shell/             AppShell、PageFab、FilterPanel、SortPanel、TableChips
    dialog/            AppDialog、ConfirmDialog、FieldsDialog
    list/              DataList、DataProfile、DataCard、DataGallery、ListLayout、ListField、GroupedList、DataTable、CountLabel
    record/            DataDetail、DetailField、DetailHeader、DataForm、RecordNav
    page/              整頁的版型：PageState（載入中／失敗／找不到）、FormPage、DetailPage、ListPage、ChildList
    panel/             裝著好幾個面板的頁面：TabPage、TabPanel（頁籤）、DashboardPage、DashboardPanel（dashboard）
                       與其排版 placePanels、dashboardContext
    view/              ViewActions（view 的列上動作，DataList、DataProfile、DataCard、DataGallery 與 DetailHeader 共用）
    auth/              PasswordLoginForm（登入頁上的表單，依登入方式替換；登入頁本身在 pages/login.vue）
  composables/
    data/              讀資料的反應式包裝：useTable（整表／排序過／單筆）、useSearch、useFilter
                       （比對與排序本身是 schema/ 底下的純函數）
    form/              表單頁：useTableForm、useLeaveGuard、useSyncHold
    shell/             跟 AppShell 溝通：useActionSlot（登記機制）、useShellActions（App Bar／
                       底部／多選出口）、useListControls、useSharedListControls（TabPage 底下
                       的列表共用搜尋）、useAppBarTabs、usePanelActive、
                       useOverlay、useActionRunner、useDialogs（confirm／notify）、useAskFields
    navigation/        路由接力：useRouteId、useListOrder、useFlow
    list/              列表互動：useMultiSelect、useLongPress、useRowClick
    page/              頁面的資料層：useRecordPage、useListPage
    actions/           useTableActions：PageAction 型別、通用動作 builder、useAction／useRowAction
    auth/              useLogin（登入頁的資料層）
  stores/tables/       共用快取、待推送佇列、row 上的 getter（見 store.md）
  services/            appScript.ts 是對後端唯一的出入口（VITE_APPS_SCRIPT_URL 沒設
                       就走 mock/ 的假後端）；dev 模式會把進出的 payload 印進 console
                       （`[api] →／←／✗`）；mock/ 在真後端穩定後整個刪掉
    auth/              token 的讀寫（見 docs/auth.md）
  schema/              對 row 做事的純函數（見 schema.md）：types（型別、coerce／format）、
                       sort、group、filter、validation、relations（關聯圖）、image、
                       view（列的版面：欄位與位置的對應）、index（註冊表：代稱 → schema）
    tables/            每張表的欄位定義，一張表一個檔
  config/              app.ts（App 名稱、登入方式）、navigation.ts（導覽列項目）
  styles/              全域的 CSS：list.css（列表中一列與卡片共用的樣式，見 docs/components/ListLayout.md；動作選單的樣式，見 docs/components/ViewActions.md）
  router/index.ts      路由實例、登入檢查、換頁動畫與方向判定、leaveAfterAction / pushWithDefaults
  pages/               檔案即路由；任意層的 _ref/ 只供其他頁面引用，不產生路由
```

頁面的檔名直接對應網址：

| 檔案 | 網址 |
| --- | --- |
| `pages/表名/index.vue` | `/表名` 列表 |
| `pages/表名/new.vue` | `/表名/new` 新增 |
| `pages/表名/[id]/index.vue` | `/表名/:id` 詳細 |
| `pages/表名/[id]/edit.vue` | `/表名/:id/edit` 編輯 |
| `pages/表名/_ref/*.vue` | 不產生路由，只供其他頁面引用（例如自頁籤頁拆出的列表）；`vite.config.mts` 的路由插件以 `exclude: ['src/pages/**/_ref/**']` 排除 |

> **注意**：同一個動態片段不能同時有 `[id].vue` 檔案和 `[id]/` 資料夾——unplugin-vue-router 會把前者當成後者的 parent layout，子路由要靠 `<router-view>` 才顯示。一律用資料夾寫法。

---

## KeepAlive 的規則

列表頁與 detail 頁都被 `<KeepAlive :max="50">` 快取，key 是 `route.fullPath`。由此而來的六條規則：

- **`[id]` 頁面一律用 `useRouteId()`**，不要自己 `watch` `route.params.id`。一個實例終其一生只對應一個網址，路由參數對它而言是常數；跟著路由走的話離開中的頁面會讀到目的地的 id（拿掉 `:key` 的話 `useRouteId()` 會在開發模式印警告）
- **快取變了就讓它變**。資料真的被刪掉時，離開中的頁面顯示「找不到這筆資料」是正確的
- **「每次進場都該重算」的東西放 `onActivated`**，因為同一個網址共用同一份實例、`setup` 不會重跑。兩種表單都在 `onActivated` 重建表單並清掉錯誤：新增頁的網址固定（不重建會停在上次的內容、也讀不到新的預設值），編輯頁「離開再回到同一筆」也是同一份實例（不重置的話上次沒存的輸入會留著，很容易被誤存）
- **Teleport 出去的浮動 UI 自己管進出場**（`PageFab`、`RecordNav` 送到 `body`），用 `onActivated`／`onDeactivated`，否則離開的頁面會把按鈕留在畫面上
- **列表載入中不要用 `v-if` 把列表整個換掉**。`v-if="loading"` / `v-else` 會在每次背景重新整理（同步鈕會重抓所有已載入的表）時卸載重建，`GroupedList` 的展開狀態就沒了。用 `PageState` 的 `spinner="linear"` 就對了——它把長條加在內容上面而不是取代內容

- **捲動位置不是元件狀態**，KeepAlive 管不到（它保留的是元件，視窗的捲動在元件外面）。router 自己記一份 `fullPath → scrollY`：`beforeEach` 存、`scrollBehavior` 還原，上限也是 50 筆。返回鍵優先用瀏覽器記的 `savedPosition`，沒看過的頁面回到頂端

會有這些規則，是因為**被快取的頁面是全速運轉的**，理由見文末的設計取捨。

---

## 完成動作後的導覽

新增／編輯／刪除完成後要離開頁面，用 `@/router` 的 `leaveAfterAction(fallback)`，**不要用 `router.push`**。它走瀏覽器的返回；沒有 App 內的上一頁時，才 replace 到 `fallback`（例如 `'/表名'`）。

`push` 會把已經完成任務的表單頁留在歷史裡，按上一頁又回到它——編輯頁是舊表單，刪除後的 detail 更是已經不存在的資料。

---

## 離開表單前先問

由 `useLeaveGuard` 的 `router.beforeEach` 統一處理——返回鍵、導覽列、改網址、表單底部的取消全走同一條（取消鈕自己不問，否則會問兩次）。要不要問看兩件事：

- **在[連續動作](actions.md#連續動作流程)第二步之後一律問**，文案是「是否放棄未儲存的變更（包含之前的變更）？」——這張表單可能一個字都還沒填，但前面的步驟已經寫了東西，離開等於整條收回
- **不在流程裡**就看表單有沒有改動（`useCreateForm`／`useEditForm` 登記的 `dirty` getter）

說不就回傳 `false` 擋下導覽，頁面原地不動；瀏覽器返回鍵被擋下時 vue-router 會自己把歷史位置撥回來。`runStep` 自己的導覽不會誤觸（它是等 `replace` 完成才登記的），送出成功後的離開也不會被問（`resumeStep` 已經清掉等待中的步驟）。

---

## 頁面範本的四種型態

不管套到哪張表都是同一套範本，差別只在開了哪些功能。實際檔案見 [template/](../template/)。

骨架不在範本裡，而在 `components/ui/page/` 的版型元件與 `composables/page/` 的資料層——**範本只是把它們接起來的那十幾行**，所以每個頁面檔留下的都是這張表專屬的東西（哪些欄位、哪些動作）。

| 型態 | 範本 | 資料層 + 版型 | 頁面自己寫什麼 |
| --- | --- | --- | --- |
| **列表**（list） | `pages/list.vue` | `useListPage` + `ListPage` | 每列四個角、要不要多選、FAB 放什麼；分組給 `groups`（`GroupedList`）、表格走 `#rows` slot（`DataTable`），頁籤自己包 `TabPage` |
| **詳細**（detail） | `pages/detail.vue` | `useRecordPage` + `DetailPage` | 欄位動作、slot 裡的子表格或說明 |
| **表單**（form） | `pages/new.vue`、`pages/edit.vue` | `useCreateForm`／`useEditForm` + `FormPage` | 幾乎不用寫，欄位與順序都在 schema |
| **總覽**（dashboard） | 🔲 還沒有 | — | 目前沒有具體需求，保留位置 |

版面真的不一樣（表格式、混合版面）就不套版型元件，資料層仍然共用；那時要自己 `useListOrder` 發布畫面上的順序。四種頁面的載入中／失敗／找不到都由 `PageState` 一份處理。

`detailOrder` 跟 `formOrder` 故意分開，因為兩邊需求不一定相同。

---

## 設計取捨

**為什麼 KeepAlive 的 key 要帶完整網址**
不帶的話，同一個路由換 id（`/表名/A` → `/表名/B`）對 Vue 而言是同一個元件、同一個 vnode，會就地更新：頁面須自行跟著 id 重新載入，各筆的元件狀態也無法分開保留。帶完整網址後，一個實例只對應一個網址，路由參數對它而言是常數（見上方 `useRouteId` 的規則）。代價是 KeepAlive 從「每個元件一份」變成「每個網址一份」，所以要配 `max` 收斂；連續翻超過 50 筆不回列表的話，列表頁會被擠掉、展開狀態就沒了。

**為什麼換頁動畫用 View Transitions，而非 `<Transition>`**
`<Transition>` 須看到新舊兩個不同的元件才會播放。dashboard 的展開與縮回網址不變，KeepAlive 的 key 相同，前後是同一個元件，`<Transition>` 無從觸發。View Transitions 由瀏覽器截下 DOM 更新前後的畫面再播放動畫，不論前後是否為同一個元件，因此換頁與展開共用同一套。流程在 `router/index.ts`：

- **`beforeResolve` 開始動畫**：呼叫 `document.startViewTransition`，導覽等到舊畫面截好、update callback 被呼叫時才繼續。首次載入不播放
- **`afterEach` 之後放行**：等 `nextTick`（新頁面的 DOM 已更新）才讓 update callback 結束，瀏覽器隨即截下新畫面。`scrollBehavior` 的捲動排在同一個 `nextTick` 之後的 microtask，早於截圖，因此新畫面已是捲好的位置。dashboard 於 `afterEach` 中改變展開狀態，同樣落在兩次截圖之間
- **導覽失敗（被取消、被擋下）時略過動畫**：畫面沒變，滑動兩張相同的截圖沒有意義；因重導而沒有走到 `afterEach` 的那一次，於下一次的 `beforeResolve` 略過
- **滑動的是整個畫面（`root`）的截圖**，而非替內容區命名：`root` 的截圖即為當下看到的畫面，不受捲動位置影響；單獨命名內容區時，元素的位置會隨捲動改變，截圖於動畫中會上下跳動
- **外殼另外命名**：App Bar、左側抽屜、底部列、FAB、`RecordNav` 各有 `view-transition-name`，因此不在 `root` 的截圖中；舊的直接隱藏、新的不加動畫，與舊做法中「外殼不隨頁面滑動」相同
- **方向掛在 `<html>` 的 `data-dir`**，於 `afterEach` 寫入，CSS 於動畫開始時才讀取（判定規則見 `router/index.ts`）
- **不支援 View Transitions 的瀏覽器，或系統開啟「減少動態效果」時，不播放動畫**，直接切換

舊做法（`<Transition>` + `<KeepAlive>`）另有兩個限制，改用 View Transitions 後皆不復存在：離場的一側套用的是該 vnode 上次啟用時的 transition hooks，方向須改以屬性選擇器讀取；頁面的 root 須為單一元素，因此三個版型都在外面包一層 `div`（仍保留，見 [components/PageState.md](components/PageState.md)）。

**為什麼被快取的頁面還在運轉**
KeepAlive 的 `deactivate` 只搬 DOM，不會暫停元件的 effect；而 `onDeactivated` 是 post-render，比 pre-flush 的 `watch` 還晚。所以被快取的頁面仍然會對外部變化重新計算、重新渲染——而外面的世界已經換頁了。舊的換頁動畫中，離場的頁面是活的 DOM，這直接造成「閃一下錯誤內容」；改用 View Transitions 後離場的一側是截圖，不再看得到，但頁面回到畫面時仍帶著背景期間算出的狀態，上面的規則都是為此而存在。流進被快取頁面的東西只有兩種：路由參數（讀一次就固定）與共用快取（讓它變）。
