# 前端架構

程式碼與檔案的組織方式：模組化的範圍、資料夾、頁面的位置，以及頁面範本的型態。頁面在執行時與外殼、導覽的配合方式，見 [pages.md](topics/pages.md)。動作本身（包括連續動作與快速編輯對話框），見 [actions.md](topics/actions.md)。

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
    shell/             AppShell、PageFab、FilterPanel、SortPanel、TableChips、FormLayerHost、FormLayer、FieldsLayer
    dialog/            AppDialog、ConfirmDialog、FieldsDialog
    list/              DataList、DataProfile、DataCard、DataGallery、ListLayout、ListField、GroupedList、ExpandAllRow、DataTable、CountLabel
    record/            DataDetail、DetailField、DetailHeader、DataForm、FieldInput、InlineField、RecordNav
    page/              整頁的版型：PageState（載入中、失敗、找不到）、PageActions（FAB 與 App Bar 的動作）、DetailPage、ListPage、
                       ChildList（詳細頁的子表區塊）、ChildBlock（區塊的外觀，供 ListPage 使用）、ChartPage
    panel/             含多個面板的頁面：TabPage、TabPanel（頁籤）、DashboardPage、DashboardPanel（dashboard），
                       以及排版的 placePanels、dashboardContext
    view/              ViewActions（view 的列上動作，DataList、DataProfile、DataCard、DataGallery 與 DetailHeader 共用）、
                       FormattedValue（值與條件式格式）
    chart/             DataChart（以 Chart.js 畫出 defineChart 的圖表）、DataStat（以文字顯示 stat）
                       與 chartConfig（Chart.js 設定的組成與數值的格式）
    auth/              PasswordLoginForm（登入頁上的表單，依登入方式替換。登入頁本身在 pages/login.vue）
  composables/
    data/              讀取資料的反應式包裝：useTable（整張表、排序後、單一列）、useSearch、useFilter
                       （比對與排序本身為 schema/ 中的純函數）
    form/              表單的內容：useTableForm
    shell/             與 AppShell 溝通：
                       useActionSlot（登記機制，以及容器收下內容登記的 relaySlot）、useShellActions（App Bar、多選的出口）、
                       useFormLayers、formLayerState（表單層，見 docs/topics/pages.md）、
                       useListControls、useSharedListControls（TabPage 與 DashboardPage 中的列表共用搜尋）、
                       useDashboardLinks（dashboard 的連動中心與面板的輸入、輸出）、
                       panelContext（面板與頁籤共用的接線）、useCompactLayout、
                       viewTransition（換頁與面板內轉場共用的函數）、useCurrentTab、usePanelActive（含 usePanelVisible）、
                       useOverlay、useActionRunner、useDialogs（confirm、notify）、useAskFields
    navigation/        路由的接力：useRouteId、useListOrder、useFlow
    list/              列表的互動：useMultiSelect、useLongPress、useRowClick、useColumnWidths（表格的欄寬）
    page/              頁面的資料層：useRecordPage、useListPage，以及 childBlock（子表區塊的設定）
    actions/           useTableActions：PageAction 型別、通用的動作 builder、useAction、bindActions
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
  config/              app.ts（App 名稱、登入方式、詳細頁欄位的排法、計時推送）、navigation.ts（導覽列項目）
  plugins/             vuetify.ts（主題，包括共用色名 vuesheet-*，以及元件的預設值）
  styles/              全域的 CSS：list.css（列表中一列與卡片共用的樣式，見 docs/components/list/ListLayout.md。
                       動作選單的樣式，見 docs/components/view/ViewActions.md）
  router/index.ts      路由實例、登入檢查、換頁動畫與方向判定、leaveAfterAction
  pages/               檔案即路由，見「頁面的位置」
tests/               Vitest 的測試，結構對應 src/（例如 tests/schema/filter.test.ts 測 src/schema/filter.ts）
  setup.ts             每個測試檔執行前載入：替換 fetch，測試中的請求一律失敗
  fixtures/            測試共用的 schema，不使用 src/schema/tables 中的表
    backend/           假後端的測試資料：三張表（父表、子表、附註）的 schema 與 CSV
```

**測試**：`npm test` 執行一次，`npm run test:watch` 於修改時重跑。測試以 `@/` 匯入 `src/` 的模組，不涵蓋元件的外觀與排版。設定見 `vitest.config.mts`，型別檢查見 `tsconfig.vitest.json`。
- 純函數直接呼叫
- store、佇列與儀表板的連動經由假後端測試。測試檔以 `vi.mock` 將 `@/schema` 與 `@/services/mock/tables` 換成 `tests/fixtures/backend/` 中的版本，並將 `@/config/app` 的 `authMethod` 改為 `'none'`
- 每個測試前呼叫 `freshBackend()`：重新載入模組並建立新的 Pinia，假後端的資料與 store 的狀態回到初始值
- 測試不讀取 `.env`，未設定 `VITE_APPS_SCRIPT_URL`，因此使用假後端

---

## 頁面的位置

頁面的檔名直接對應網址：

| 檔案 | 網址 | 內容 |
| --- | --- | --- |
| `pages/index.vue` | `/` | 首頁。專案通常改為轉址至其他頁面 |
| `pages/login.vue` | `/login` | 登入頁 |
| `pages/表名/index.vue` | `/表名` | 表的預設頁，通常為列表，也可以是頁籤、儀表板或圖表 |
| `pages/表名/[id]/index.vue` | `/表名/:id` | 一列的預設頁，即詳細頁 |
| `pages/表名/[id]/檔名.vue` | `/表名/:id/檔名` | 一列的其他頁面，例如子表的展開頁 |
| `pages/表名/檔名.vue` | `/表名/檔名` | 表的其他頁面，例如圖表 |
| `pages/頁面名/index.vue` | `/頁面名` | 獨立頁面的預設頁，例如儀表板 |
| `pages/頁面名/檔名.vue` | `/頁面名/檔名` | 獨立頁面的其他頁面 |
| 任意資料夾的 `_ref/檔名.vue` | 沒有網址 | 只供其他頁面導入，例如從頁籤頁拆出的列表 |

**資料夾**
- `pages/` 下的資料夾為表或獨立頁面。表的資料夾以表的代稱為名。獨立頁面的資料夾自由命名，但不可與表的代稱相同
- `pages/` 下的單一檔案只有 `index.vue` 與 `login.vue`
- 檔案的位置與導覽無關。修改導覽時不搬移檔案

**檔案**
- `index.vue` 與 `[id]/index.vue` 以外的檔案自由命名
- 表與獨立頁面的 `index.vue` 直接寫出預設頁的內容
- 表沒有預設頁時，可以沒有 `index.vue`
- 頁面可以由其他頁面導入，無須移至 `_ref/`

**子表的展開頁**
- 每個子表區塊都有一個展開頁，位於父表的 `[id]/`
- 取得子列的方式、每一列的版面與動作只寫在展開頁。父表的詳細頁以 [ChildList](components/page/ChildList.md) 導入展開頁
- 同一張子表有數張父表時，各父表各有自己的展開頁

**`_ref/`**
- 任何資料夾都可以有 `_ref/`。`_ref/` 中的檔案也可以互相導入
- 建議的位置依序為：
  1. 用到它的資料夾
  2. 對應的表的資料夾，即它所顯示的資料的表
  3. 其他表的資料夾
  4. 獨立頁面的資料夾
- 數個資料夾用到同一個檔案時，於這些資料夾中依第 2 項至第 4 項的順序選擇
- 建立之後，使用它的資料夾增加時無須搬移
- 路由插件於 `vite.config.mts` 以 `exclude: ['src/pages/**/_ref/**']` 排除 `_ref/`，新增表時無須修改設定
- `_ref` 表示「供其他頁面引用」，與 `ref` 欄位型別及 Vue 的 `ref()` 無關

> **注意**：同一個動態片段不能同時有 `[id].vue` 檔案與 `[id]/` 資料夾。unplugin-vue-router 將前者視為後者的 parent layout，子路由須經由 `<router-view>` 才顯示。一律使用資料夾的寫法。

---

## 頁面範本的五種型態

不論套用於哪張表，皆為同一套範本，差別只在開啟了哪些功能。實際的檔案見 [template/](../template/)，各頁面的外觀與用途見 [design/](design/README.md)。

頁面的主體不在範本中，而在 `components/ui/page/`、`components/ui/panel/` 的版型元件，與 `composables/page/` 的資料層。**範本只是將它們接起來的十幾行**，因此每個頁面檔中留下的皆為該表專屬的內容，例如哪些欄位、哪些動作。

| 型態 | 範本（`template/pages/`） | 資料層與版型 | 頁面須決定的事 |
| --- | --- | --- | --- |
| **列表**（list） | `list.vue`（deck），另有 `profile-list.vue`、`card-list.vue`、`gallery-list.vue` | `useListPage` + `ListPage` | 版面與 view、是否多選、分組、FAB |
| **頁籤**（tab） | `tab-list.vue` + `_ref/list.vue` | `TabPage`，各頁籤中為 `useListPage` + `ListPage` | 依哪個欄位分頁籤、各頁籤的內容 |
| **詳細**（detail） | `detail.vue`。子表區塊與展開頁為 `child-list.vue` | `useRecordPage` + `DetailPage` | 選用的標頭、欄位的動作、子表區塊等 slot 中的內容 |
| **儀表板**（dashboard） | `dashboard.vue` | `DashboardPage` + `DashboardPanel`，面板中放置 `_ref/` 中的列表、詳細頁與其他頁面 | 放入哪些面板、各自的大小、面板之間如何接線 |
| **圖表**（chart） | `chart.vue` | `useListPage` + `defineChart` + `ChartPage` | 圖表的種類、分組的欄位與每組的數值 |

- 表單不是頁面，無須範本，由 `openForm` 開啟（見 [pages.md](topics/pages.md#表單層)）
- 版面與上述皆不同時（例如自訂的排列方式），不套用版型元件，資料層仍可共用。此時須自行以 `provideListOrder` 提供畫面上的順序
- 各型態的載入中、載入失敗與找不到資料，皆由同一個 `PageState` 處理
- `detailOrder` 與 `formOrder` 分開設定，個別頁面可以 `order` prop 覆寫
