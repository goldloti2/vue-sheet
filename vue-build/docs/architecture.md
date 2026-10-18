# 前端架構

程式碼與檔案如何組織：模組化的範圍、資料夾，以及頁面範本的型態。頁面在執行時如何與外殼、導覽配合見 [pages.md](pages.md)，動作本身（含連續動作與快速編輯對話框）見 [actions.md](actions.md)。

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
                       底部／多選出口）、useListControls、useSharedListControls（TabPage 與
                       DashboardPage 底下的列表共用搜尋）、useDashboardSelection（dashboard 的
                       互動）、useCompactLayout、viewTransition（換頁與面板內的轉場共用的零件）、
                       useAppBarTabs、usePanelActive、
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
  styles/              全域的 CSS：list.css（列表中一列與卡片共用的樣式，見 docs/components/list/ListLayout.md；動作選單的樣式，見 docs/components/view/ViewActions.md）
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

## 頁面範本的五種型態

不論套用於哪張表皆為同一套範本，差別僅在開啟了哪些功能。實際的檔案見 [template/](../template/)，各頁面的外觀與用途見 [design/](design/README.md)。

頁面的主體不在範本中，而在 `components/ui/page/`、`components/ui/panel/` 的版型元件與 `composables/page/` 的資料層；**範本只是將它們接起來的十幾行**，因此每個頁面檔中留下的皆為該表專屬的內容（哪些欄位、哪些動作）。

| 型態 | 範本（`template/pages/`） | 資料層與版型 | 頁面須決定的事 |
| --- | --- | --- | --- |
| **列表**（list） | `list.vue`（deck），另有 `profile-list.vue`、`card-list.vue`、`gallery-list.vue` | `useListPage` + `ListPage` | 版面與 view、是否多選、分組、FAB |
| **頁籤**（tab） | `tab-list.vue` + `_ref/list.vue` | `TabPage`，各頁籤中為 `useListPage` + `ListPage` | 依哪個欄位分頁籤、各頁籤的內容 |
| **詳細**（detail） | `detail.vue`；子表的完整列表為 `child-list.vue` | `useRecordPage` + `DetailPage` | 選用的標頭、欄位的動作、子表區塊等 slot 中的內容 |
| **表單**（form） | `new.vue`、`edit.vue` | `useCreateForm`／`useEditForm` + `FormPage` | 幾乎不需撰寫，欄位與順序由 schema 決定 |
| **儀表板**（dashboard） | `dashboard.vue` | `DashboardPage` + `DashboardPanel`，面板中放各表 `_ref/` 中的列表與詳細頁 | 放入哪些面板、各自的大小、是否開啟互動模式 |

版面與上述皆不同時（例如自訂的排列方式），不套用版型元件，資料層仍可共用；此時須自行以 `useListOrder` 發布畫面上的順序。各型態的載入中、載入失敗與找不到資料，皆由同一個 `PageState` 處理。

`detailOrder` 與 `formOrder` 刻意分開，因為兩者的需求不一定相同。

---

## 設計取捨

**為什麼 KeepAlive 的 key 要帶完整網址**
不帶的話，同一個路由換 id（`/表名/A` → `/表名/B`）對 Vue 而言是同一個元件、同一個 vnode，會就地更新：頁面須自行跟著 id 重新載入，各筆的元件狀態也無法分開保留。帶完整網址後，一個實例只對應一個網址，路由參數對它而言是常數（見 [pages.md](pages.md#keepalive-的規則) 中 `useRouteId` 的規則）。代價是 KeepAlive 從「每個元件一份」變成「每個網址一份」，所以要配 `max` 收斂；連續翻超過 50 筆不回列表的話，列表頁會被擠掉、展開狀態就沒了。

**為什麼換頁動畫用 View Transitions，而非 `<Transition>`**
`<Transition>` 須看到新舊兩個不同的元件才會播放。dashboard 的展開與縮回網址不變，KeepAlive 的 key 相同，前後是同一個元件，`<Transition>` 無從觸發。View Transitions 由瀏覽器截下 DOM 更新前後的畫面再播放動畫，不論前後是否為同一個元件，因此換頁與展開共用同一套。共用的零件在 `composables/shell/viewTransition.ts`（是否播放、開始一次轉場並於截好舊畫面後交回「完成」與「略過」、寫入 `<html>` 的屬性），dashboard 面板內的轉場亦使用；換頁的流程在 `router/index.ts`：

- **`beforeResolve` 開始動畫**：呼叫 `document.startViewTransition`，導覽等到舊畫面截好、update callback 被呼叫時才繼續。首次載入不播放
- **`afterEach` 之後放行**：等 `nextTick`（新頁面的 DOM 已更新）才讓 update callback 結束，瀏覽器隨即截下新畫面。`scrollBehavior` 的捲動排在同一個 `nextTick` 之後的 microtask，早於截圖，因此新畫面已是捲好的位置。dashboard 於 `afterEach` 中改變展開狀態，同樣落在兩次截圖之間
- **導覽失敗（被取消、被擋下）時略過動畫**：畫面沒變，滑動兩張相同的截圖沒有意義；因重導而沒有走到 `afterEach` 的那一次，於下一次的 `beforeResolve` 略過
- **滑動的是整個畫面（`root`）的截圖**，而非替內容區命名：`root` 的截圖即為當下看到的畫面，不受捲動位置影響；單獨命名內容區時，元素的位置會隨捲動改變，截圖於動畫中會上下跳動
- **外殼另外命名**：App Bar、左側抽屜、底部列、FAB、`RecordNav` 各有 `view-transition-name`，因此不在 `root` 的截圖中；舊的直接隱藏、新的不加動畫，與舊做法中「外殼不隨頁面滑動」相同
- **方向掛在 `<html>` 的 `data-dir`**，於 `afterEach` 寫入，CSS 於動畫開始時才讀取（判定規則見 `router/index.ts`）。同時寫入 `data-transition="page"`，與 dashboard 面板內的轉場（`data-transition="panel"`，見 [dashboard.md](dashboard.md) 的「面板內的轉場」）區分：兩者共用 View Transitions，`root` 只在換頁時滑動
- **不支援 View Transitions 的瀏覽器，或系統開啟「減少動態效果」時，不播放動畫**，直接切換

舊做法（`<Transition>` + `<KeepAlive>`）另有兩個限制，改用 View Transitions 後皆不復存在：離場的一側套用的是該 vnode 上次啟用時的 transition hooks，方向須改以屬性選擇器讀取；頁面的 root 須為單一元素，因此三個版型都在外面包一層 `div`（仍保留，見 [components/page/PageState.md](components/page/PageState.md)）。

**為什麼被快取的頁面還在運轉**
KeepAlive 的 `deactivate` 只搬 DOM，不會暫停元件的 effect；而 `onDeactivated` 是 post-render，比 pre-flush 的 `watch` 還晚。所以被快取的頁面仍然會對外部變化重新計算、重新渲染——而外面的世界已經換頁了。舊的換頁動畫中，離場的頁面是活的 DOM，這直接造成「閃一下錯誤內容」；改用 View Transitions 後離場的一側是截圖，不再看得到，但頁面回到畫面時仍帶著背景期間算出的狀態，[pages.md](pages.md#keepalive-的規則) 中的規則都是為此而存在。流進被快取頁面的東西只有兩種：路由參數（讀一次就固定）與共用快取（讓它變）。

**為什麼表單的按鈕在螢幕最底端**
「取消」與「送出」始終位於拇指可及之處，不必將長表單捲到最後才能按到。表單本來就是「按下才算完成」的頁面，此時不應讓使用者分心切換頁面，因此直接取代底部導覽列。

**為什麼 App Bar 動作走 provide/inject、FAB 走 Teleport**
App Bar 屬於 `AppShell`，頁面只需將動作交給它，不需實際搬移 DOM；FAB 為 `position: fixed`，放在頁面中時，帶有 `transform` 或 containment 的祖先（例如 dashboard 的面板）會成為它的定位基準，因此送至 `body`。換頁動畫中兩者皆另有 `view-transition-name`，不隨頁面滑動（見上方「為什麼換頁動畫用 View Transitions」）。

**為什麼每一塊都是單一 setter**
三處皆經由同一個 `registerActions`（`useActionSlot.ts`），同一時間只採用一個頁面的動作。因此必須以 `isActive` 擋下被 KeepAlive 快取的頁面：這些頁面仍在全速運轉（見 [pages.md](pages.md#keepalive-的規則)），其動作一旦改變，便會蓋掉目前頁面的動作。
