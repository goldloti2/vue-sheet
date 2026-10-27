# 前端架構

程式碼與檔案的組織方式：模組化的範圍、資料夾，以及頁面範本的型態。頁面在執行時與外殼、導覽的配合方式，見 [pages.md](topics/pages.md)。動作本身（包括連續動作與快速編輯對話框），見 [actions.md](topics/actions.md)。

> **前置**：建議先閱讀 [schema.md](topics/schema.md)。此處常提到 schema 與列上的 getter。

> **標記**：沒有標記表示已實作。🔶 為部分實作，🔲 為尚未實作。詳細進度見 [ROADMAP.md](../../ROADMAP.md)。

---

## 模組化的範圍

模組化指的是**共用同一套外觀元件與資料存取邏輯**，不是自動產生整頁的 UI。

```
[共用元件庫]  [Composables 資料存取]  [頁面範本]
        ↘            ↓            ↙
              [手寫頁面 pages/*.vue]
                       ↓
         [檔案式路由：自動產生／刪除路由]
```

**頁面仍為手寫**，重複的部分由元件庫、composables 與頁面範本減少。新增或刪除頁面時，只須修改 `pages/` 中的檔案，路由自動跟著改變。

---

## 資料夾

```
src/
  components/ui/     共用元件庫，用法見 docs/components/
    shell/             AppShell、PageFab、FilterPanel、SortPanel、TableChips
    dialog/            AppDialog、ConfirmDialog、FieldsDialog
    list/              DataList、DataProfile、DataCard、DataGallery、ListLayout、ListField、GroupedList、DataTable、CountLabel
    record/            DataDetail、DetailField、DetailHeader、DataForm、FieldInput、InlineField、RecordNav
    page/              整頁的版型：PageState（載入中、失敗、找不到）、FormPage、DetailPage、ListPage、ChildList
    panel/             含多個面板的頁面：TabPage、TabPanel（頁籤）、DashboardPage、DashboardPanel（dashboard），
                       以及排版的 placePanels、dashboardContext
    view/              ViewActions（view 的列上動作，DataList、DataProfile、DataCard、DataGallery 與 DetailHeader 共用）、
                       FormattedValue（值與條件式格式）
    chart/             DataChart（以 Chart.js 畫出 defineChart 的圖表）與 chartConfig（Chart.js 設定的組成）
    auth/              PasswordLoginForm（登入頁上的表單，依登入方式替換。登入頁本身在 pages/login.vue）
  composables/
    data/              讀取資料的反應式包裝：useTable（整張表、排序後、單一列）、useSearch、useFilter
                       （比對與排序本身為 schema/ 中的純函數）
    form/              表單頁：useTableForm、useLeaveGuard、useSyncHold
    shell/             與 AppShell 溝通：
                       useActionSlot（登記機制）、useShellActions（App Bar、底部、多選的出口）、
                       useListControls、useSharedListControls（TabPage 與 DashboardPage 中的列表共用搜尋）、
                       useDashboardSelection（dashboard 的互動）、useCompactLayout、
                       viewTransition（換頁與面板內轉場共用的函數）、useAppBarTabs、usePanelActive、
                       useOverlay、useActionRunner、useDialogs（confirm、notify）、useAskFields
    navigation/        路由的接力：useRouteId、useListOrder、useFlow
    list/              列表的互動：useMultiSelect、useLongPress、useRowClick、useColumnWidths（表格的欄寬）
    page/              頁面的資料層：useRecordPage、useListPage
    actions/           useTableActions：PageAction 型別、通用的動作 builder、useAction、useRowAction
    auth/              useLogin（登入頁的資料層）
  stores/tables/       共用快取、待推送佇列、列上的 getter（見 topics/store.md）
  services/            appScript.ts 為對後端唯一的出入口。未設定 VITE_APPS_SCRIPT_URL 時，改用 mock/ 的假後端。
                       開發模式下，進出的 payload 印至 console（[api] →／←／✗）。
                       真後端穩定後，整個 mock/ 刪除
    auth/              token 的讀寫（見 docs/auth.md）
  schema/              處理列的純函數（見 topics/schema.md）：
                       types（型別、coerce、format）、sort、group、filter、validation、relations（關聯圖）、
                       image、format（顯示值與條件式格式）、view（列的版面：欄位與位置的對應）、
                       chart（圖表的宣告，見 topics/chart.md）、index（註冊表：代稱 → schema）
    tables/            每張表的欄位定義，一張表一個檔案
  config/              app.ts（App 名稱、登入方式、詳細頁欄位的排法）、navigation.ts（導覽列項目）
  plugins/             vuetify.ts（主題，包括共用色名 vuesheet-*）
  styles/              全域的 CSS：list.css（列表中一列與卡片共用的樣式，見 docs/components/list/ListLayout.md。
                       動作選單的樣式，見 docs/components/view/ViewActions.md）
  router/index.ts      路由實例、登入檢查、換頁動畫與方向判定、leaveAfterAction、pushWithDefaults
  pages/               檔案即路由。任意層的 _ref/ 只供其他頁面引用，不產生路由
```

頁面的檔名直接對應網址：

| 檔案 | 網址 |
| --- | --- |
| `pages/表名/index.vue` | `/表名`，列表 |
| `pages/表名/new.vue` | `/表名/new`，新增 |
| `pages/表名/[id]/index.vue` | `/表名/:id`，詳細 |
| `pages/表名/[id]/edit.vue` | `/表名/:id/edit`，編輯 |
| `pages/表名/_ref/*.vue` | 不產生路由，只供其他頁面引用，例如從頁籤頁拆出的列表。<br>・`vite.config.mts` 的路由插件以 `exclude: ['src/pages/**/_ref/**']` 排除，新增表時無須修改設定<br>・`_ref` 表示「供其他頁面引用」，與 `ref` 欄位型別及 Vue 的 `ref()` 無關 |

> **注意**：同一個動態片段不能同時有 `[id].vue` 檔案與 `[id]/` 資料夾。unplugin-vue-router 將前者視為後者的 parent layout，子路由須經由 `<router-view>` 才顯示。一律使用資料夾的寫法。

---

## 頁面範本的五種型態

不論套用於哪張表，皆為同一套範本，差別只在開啟了哪些功能。實際的檔案見 [template/](../template/)，各頁面的外觀與用途見 [design/](design/README.md)。

頁面的主體不在範本中，而在 `components/ui/page/`、`components/ui/panel/` 的版型元件，與 `composables/page/` 的資料層。**範本只是將它們接起來的十幾行**，因此每個頁面檔中留下的皆為該表專屬的內容，例如哪些欄位、哪些動作。

| 型態 | 範本（`template/pages/`） | 資料層與版型 | 頁面須決定的事 |
| --- | --- | --- | --- |
| **列表**（list） | `list.vue`（deck），另有 `profile-list.vue`、`card-list.vue`、`gallery-list.vue` | `useListPage` + `ListPage` | 版面與 view、是否多選、分組、FAB |
| **頁籤**（tab） | `tab-list.vue` + `_ref/list.vue` | `TabPage`，各頁籤中為 `useListPage` + `ListPage` | 依哪個欄位分頁籤、各頁籤的內容 |
| **詳細**（detail） | `detail.vue`。子表的完整列表為 `child-list.vue` | `useRecordPage` + `DetailPage` | 選用的標頭、欄位的動作、子表區塊等 slot 中的內容 |
| **表單**（form） | `new.vue`、`edit.vue` | `useCreateForm` 或 `useEditForm` + `FormPage` | 幾乎無須撰寫，欄位與順序由 schema 決定 |
| **儀表板**（dashboard） | `dashboard.vue` | `DashboardPage` + `DashboardPanel`，面板中放置各表 `_ref/` 中的列表與詳細頁 | 放入哪些面板、各自的大小、是否開啟互動模式 |

- 版面與上述皆不同時（例如自訂的排列方式），不套用版型元件，資料層仍可共用。此時須自行以 `useListOrder` 發布畫面上的順序
- 各型態的載入中、載入失敗與找不到資料，皆由同一個 `PageState` 處理
- `detailOrder` 與 `formOrder` 分開設定，個別頁面可以 `order` prop 覆寫
