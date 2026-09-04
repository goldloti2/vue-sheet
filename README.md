# Google Sheets 後端 + 自訂 GUI App — 框架

用 Google Sheet 當後端、自己寫前端 GUI（外觀仿 AppSheet）的通用框架。

- 目前進度與待辦：[ROADMAP.md](ROADMAP.md)
- 新增一張表／一個頁面怎麼做：[vue-build/template/README.md](vue-build/template/README.md)

> **標記說明**：沒有標記的段落＝已經實作、程式碼就是這樣。
> 🔶 部分實作、🔲 尚未實作（只是設計方向，程式碼裡還沒有）、✅ 用在被 🔶 段落包住、但本身已完成的小節。
> 詳細進度見 [ROADMAP.md](ROADMAP.md)。

---

## 一、目標與整體架構

- **後端**：Google Sheet
- **前端**：自訂 GUI，外觀仿 AppSheet，但不用 low-code builder（自己寫程式）
- **平台**：手機與電腦瀏覽器共用同一份程式碼
- **使用規模**：單人使用

```
[前端 GUI]  ⇄  [Apps Script Web App]  ⇄  [Google Sheet]
靜態託管         驗證/邏輯/CRUD           實際資料儲存
```

Google Sheets 不讓前端裸連（會暴露金鑰，而且每個使用者都要走 Google OAuth 太重），中間一定要有一層 API。

兩端都是「有請求才動」，不需要自己開伺服器：前端 `npm run build` 產出純靜態檔案丟靜態託管，後端 Apps Script 由 Google 代管。

---

## 二、技術選型

### 2.1 後端：Apps Script Web App

在 Sheet 綁定的 Apps Script 寫 `doGet`/`doPost`，部署成網址供前端 fetch。免費、免架站、Google 代管。

**API 配額**（2026，官方文件 https://developers.google.com/workspace/sheets/api/limits）：讀取每分鐘每專案 300 次、每使用者 60 次，寫入同規則，每日無硬性上限。個人使用通常足夠，但 2026 年稍晚起超額會計費，建議做請求節流。

### 2.2 前端：Vue 3 + TypeScript

- UI 元件庫 **Vuetify**——AppSheet 本身走 Material Design，用 Material 元件庫最容易神似
  - 配色沿用 Vuetify 預設藍色系，元件密度 comfortable
  - 圖示用 `@mdi/js`（SVG 版，只打包用到的圖示）。Vuetify 內建 UI 圖示走 `vuetify/iconsets/mdi-svg`；App 自訂圖示則具名 import 常數綁 `v-icon` 的 `:icon`，不另外維護全域字串別名表
  - 深色模式：兩套主題都定義在設定裡保留彈性，但目前只啟用 light，不做切換開關
- 路由用 **unplugin-vue-router**（檔案式、型別安全）
- 狀態用 **Pinia**

---

## 三、資料表設計慣例

1. 每個 Sheet 分頁 = 一張「表」
2. **每張表第一欄放唯一 ID**——不用 row number 當主鍵，排序/刪除/插入都會讓 row index 位移
3. ID 同時作為跨表關聯的外鍵

### 一對多關聯

外鍵放在「多」的那一方，「一」的那一方不存任何清單。

前端不需要為每個關聯另外寫東西：在子表的 schema 欄位標 `{ type: 'ref', refTable: '父表' }` 就完成了，`schema/relations.ts` 會在載入時掃過所有 schema 自動算出關聯圖。標好之後 `DataDetail` 會自動把該欄位變成連到對方 detail 頁的連結，`useRelatedRows(子表, 父表)` 也能直接用，欄位名自動解析。

### Sheet 表頭用中文

Sheet 的實際表頭列用中文，方便直接開 Sheet 檢查或手改資料。Schema 每個欄位除了程式用的英文 `key`，另外有對應實際表頭文字的 `sheetHeader`：

```ts
{ key: '英文key', label: '中文標籤', sheetHeader: '中文標籤', type: 'text' }
```

因為 `label` 本來就是中文，`sheetHeader` 通常跟 `label` 同值，所以它宣告成可省略，省略時自動 fallback 用 `label`。

---

## 四、模組化架構

模組化指的是**共用同一套外觀元件與資料存取邏輯**，不是自動產生整頁 UI。每張表顯示方式差異大，還有跨表組合頁面，所以頁面仍然手寫，但靠共用元件庫、composables、頁面範本壓低重複；新增/刪除頁面則靠檔案式路由達成低摩擦擴充。

```
[共用元件庫]  [Composables 資料存取]  [頁面範本]
        ↘            ↓            ↙
              [手寫頁面 pages/*.vue]
                       ↓
         [檔案式路由：自動產生/刪除路由]
```

### 4.1 前端模組結構

```
src/
  components/ui/            共用元件庫（每個元件的用法見 template/components/*.md）
    AppShell.vue              頂部 AppBar + 導覽外殼；標題來自 route.meta.title，
                              右側動作按鈕來自 useAppBarActions()
    DataList.vue              卡片式列表的單列（含長按多選）
    ListField.vue             DataList 內部的兩列四角排版
    GroupedList.vue           多層可收合分組
    DataTable.vue             表格式列表；detail 頁內嵌的關聯子表格也用同一個
    DataDetail.vue            整頁 detail 欄位區，自帶 loading/error/找不到資料三種狀態
    DetailField.vue           單一欄位顯示
    DataForm.vue              表單版的 DataDetail，依 column.type 自動選輸入元件
    PageFab.vue               右下角浮動按鈕
    TabBar.vue                頁籤篩選
    AppDialog.vue             對話框外殼
    ConfirmDialog.vue         是/否確認框，建立在 AppDialog 上
  composables/
    useTableList.ts           整表讀取（走共用快取）
    useSortedTableList.ts     上者 + schema.defaultSort 排序；列表頁預設用這個
    useTableRow.ts            單筆讀取
    useRelatedRows.ts         子表整表 + 依關聯圖的外鍵分組
    useTableForm.ts           useCreateForm / useEditForm，新增與編輯的共用邏輯
    useRouteId.ts             [id] 頁面取路由參數（見 4.3）
    useAppBarActions.ts       把動作註冊到 AppShell 的 app-bar（provide/inject）
    useMultiSelect.ts         多選狀態
    useLongPress.ts           長按偵測
    actions/
      useTableActions.ts        PageAction 型別 + 通用動作 builder
                                （useNewAction/useEditAction/useDeleteAction/useBulkDeleteAction）
  stores/
    tables.ts                 每張表一份共用快取 + 寫入用的 CRUD action（見 4.2）
  services/
    appScript.ts              對後端唯一的出入口：fetchTable / mutateTable
    types.ts                  API 合約型別（SheetAction / ApiResponse）
    mock/                     假後端，正式後端接上後整個資料夾刪掉
      backend.ts                記憶體資料表 + 增刪改查
      csv.ts                    CSV 解析
      tables.ts                 哪張表用哪份 mock CSV（專案自己的內容）
  schema/
    types.ts                  SchemaColumn / TableSchema 型別 + 轉換與排序分組函式
    relations.ts              掃 schema 的 ref 欄位自動算出的關聯圖
    index.ts                  代稱 → Schema 對照表，匯出 TableKey
  config/navigation.ts        導覽項目設定
  pages/                      檔案即路由
    表名/index.vue              → /表名          列表
    表名/new.vue                → /表名/new      新增
    表名/[id]/index.vue         → /表名/:id      詳細
    表名/[id]/edit.vue          → /表名/:id/edit 編輯
```

**注意**：同一個動態片段不能同時有 `[id].vue` 檔案和 `[id]/` 資料夾——unplugin-vue-router 會把前者當成後者的 parent layout，子路由要靠 `<router-view>` 才顯示。一律用 `[id]/index.vue` + `[id]/edit.vue` 的資料夾寫法。

### 4.2 資料流：讀取與寫入

**讀取**：同一張表全 App 只抓一次，共用一份。

```
頁面 → useTableList/useSortedTableList/useTableRow/useRelatedRows
     → stores/tables.ts（有快取就直接給，沒有才抓）
     → services/appScript.ts fetchTable
     → 後端回原始字串 → coerceRow 依 schema 轉型別 → 存進快取
```

型別轉換只發生在 `fetchTable` 這一個點：後端形狀是 `Record<string, string>`，前端形狀是轉好型別的 Row（`Date`／`number`／`null`）。

**寫入**：一律走 store 的四個 action，**不要在頁面或元件裡直接呼叫 `mutateTable`**。

```ts
store.create(table, values)      // 回傳新建那筆，並 push 進快取
store.update(table, id, values)  // 回傳更新後那筆，並替換快取裡的那筆
store.remove(table, id)          // 從快取移除
store.removeMany(table, ids)     // 逐筆刪，全部成功才一起從快取移除
```

順序固定是「先送後端 → 成功了才改快取」，失敗就讓錯誤往上拋、快取維持原狀（不做 optimistic update）。因為 store 自己會把快取補好，呼叫端**不需要**手動 refresh。跨表算出來的值（例如父表顯示子表的加總）因為讀的是同一份共用資料，會自動跟著重算，不需要任何跨表失效機制。

一般頁面連這四個 action 都用不到——新增/編輯用 `useCreateForm`／`useEditForm`，刪除用 `useDeleteAction`／`useBulkDeleteAction`，內部都接好了。

### 4.3 KeepAlive 與路由參數

列表頁與 detail 頁都被 `<KeepAlive>` 快取，元件實例會跨路由重複使用，這帶來兩個必須注意的點：

- **`[id]` 頁面取 id 一律用 `useRouteId()`**，不要自己讀 `route.params.id`。在 `setup` 裡讀一次會卡在第一次進入的 id（於是刪到別筆資料）；寫成完全響應式的 getter 又會在離開頁面時跟著變 `undefined`（返回動畫期間閃「找不到這筆資料」）。`useRouteId()` 跟著路由更新，但只在參數真的存在時更新。
- **列表載入中不要用 `v-if` 把列表整個換掉**。`v-if="loading"` / `v-else` 會在每次背景重新整理時卸載重建，`GroupedList` 的展開狀態就沒了。改用 `v-progress-linear v-if="loading"` 搭配獨立的 `v-if="!error"`，讓列表持續掛著。

### 4.4 完成動作後的導覽

新增/編輯/刪除完成後要離開頁面，用 `@/router` 的 `leaveAfterAction(fallback)`，**不要用 `router.push`**。`push` 會把已經完成任務的表單頁留在歷史裡，按上一頁又回到它（編輯頁是舊表單，刪除後的 detail 更是已經不存在的資料）。`leaveAfterAction` 走瀏覽器返回，沒有 App 內上一頁（例如直接貼網址進來）時才 `replace` 到 fallback。

### 4.5 Schema 的角色

- 前端讀取時的型別轉換依據
- 共用欄位元件的設定來源（顯示順序、輸入元件選擇、select 的選項、ref 的目標表）
- 後端泛用 CRUD 引擎的依據
- **不用來自動產生整個頁面**——版面與內容由開發者決定

前後端各自維護一份 Schema，不共用程式碼。欄位改動期間先接受手動同步，之後真的常對不起來再考慮做產生器。

🔲 **驗證的分工**（設計已定，還沒實作）：**合法性驗證只在前端做**——required、數值範圍、`select` 的選項這些，全部從 schema 推導出同一份驗證函式，用在兩個地方：form 層即時逐欄提示（給使用者看），以及 store 的寫入 action 再擋一次（給程式看，因為所有寫入只能走 store，那是唯一的窄口）。後端只做安全性與**結構完整性**檢查：id 不重複、`update`／`delete` 的目標存在、表名與欄位名都在 schema 內。最後一項不能省——打錯的欄位名會直接在 Sheet 上長出一欄新表頭或寫錯格。反正 Sheet 本來就能手動打開來亂改，後端擋合法性也擋不完整，不如把那份責任明確劃給前端。

`schema/index.ts` 另外帶「代稱 → 實際 Sheet 分頁名稱」的對照：程式碼裡好打的英文代稱（例如 `'order'`）不等於 Sheet 分頁的實際名稱（可能是中文）。打 API 時用的是 schema 裡的 `sheetName`，兩者故意分開——換代稱不影響 API，換分頁名稱也不用到處改字串。

`SchemaColumn.type` 有 `text`／`number`／`date`／`ref`／`select`。用 discriminated union 寫，讓「標了 `type: 'ref'` 卻忘記填 `refTable`」在編譯期就報錯。`refTable` 目前只存代稱字串，沒有型別檢查它是否真的存在於 `schemas`——這是為了避免 `schema/types.ts` 反過來 import `schema/index.ts` 造成循環依賴，先接受這個小缺口。

### 4.6 頁面範本的四種型態

不管套到哪張表都是同一套範本，差別只在開了哪些功能。實際檔案見 `vue-build/template/`。

- **列表**：卡片式（適合瀏覽）或表格式（適合比對、多選）。排序依 `schema.defaultSort`。可選功能：分組、Tabs 篩選、搜尋、多選
- **詳細**：顯示單筆所有欄位，順序依 `schema.detailOrder`。可選功能：內嵌關聯子表格、計算欄位（`extraFields`）、編輯/刪除入口
- **表單**：依欄位型別自動選輸入元件，順序依 `schema.formOrder`。新增與編輯共用同一套版面
- **總覽**：彙整多筆/跨表的聚合數字。目前沒有具體需求，保留位置

`detailOrder` 跟 `formOrder` 故意分開，因為兩邊需求不一定相同。

### 4.7 後端客製邏輯擴充點（Hooks）

> 🔲 **尚未實作。** 這是後端的擴充點，而後端整個還沒開始寫；前端 `TableSchema` 也還沒有 `hooks` 欄位。這裡只記設計方向。

某張表需要「不只是泛用 CRUD」的邏輯時（自動算欄位、送出前驗證、建立後通知），在 Schema 裡掛勾：

```ts
hooks: {
  beforeCreate: (data) => { /* ... */ return data },
  computedFields: { 計算欄位名: (row) => /* ... */ }
}
```

泛用引擎在對應時機檢查該表有沒有掛 hook，有就呼叫，沒有走預設流程——**特例永遠是「加掛勾」而不是「改引擎」**。

---

## 五、CRUD API 設計決策

> 🔶 **部分實作。** 這一節是跟「還不存在的後端」之間的約定。目前只有 `services/mock/` 的假後端：action 名稱與「回傳異動到的那筆」的形狀已經照這裡實作，但 HTTP 那一層（doGet/doPost、`{ success }` 信封、`VITE_APPS_SCRIPT_URL`）都還沒接上——`services/types.ts` 的 `ApiResponse` 型別已定義但還沒有人使用。

### 請求與回應

- 讀取走 `doGet` + query string，寫入走 `doPost` + JSON body，body 帶 `action` 欄位。這是 Apps Script 只有 doGet/doPost 兩種入口所決定的，不是可選項
- 支援的 action：`create`、`update`、`delete`、`bulkUpdate`（一次對多筆 id 套用同樣的欄位更新，格式 `{ action, table, ids, data }`，一次執行內完成多筆，避免來回呼叫）
- 保留字：`table`、`id`、`action` 不能拿來當篩選欄位名稱
- 回應統一包裝成 `{ success: true, data }` 或 `{ success: false, error: { message } }`
- **重要限制**：Apps Script Web App 無法自由設定 HTTP status code（幾乎都回 200），前端一律看 body 的 `success` 判斷成敗，不看 status
- 錯誤只回一句 `message`，不分類 error code（單人使用，看得懂就好）
- 部署後的網址放環境變數 `VITE_APPS_SCRIPT_URL`（`.env`，不進版控）

### 資料量

> ✅ **已實作。**

- 不做分頁，整表一次撈回（個人使用資料量不大，真的變慢再說）
- 排序、篩選、搜尋一律在前端對已抓回的資料處理，不在 API 層加參數

### 資料一致性

> 🔲 **尚未實作。** 下面兩項都還沒做——目前送出前完全沒有檢查，也沒有 `updatedAt` 欄位。

**驗證**：前後端都做，但都是「照 Schema 動態檢查 required/type」的輕量通用函式。目的不是防外部攻擊（那已經靠 Google 帳號擋掉了），而是防自己送出壞資料。兩邊各寫一份即可，不需要共用程式碼。

**多裝置同時編輯**：做樂觀鎖定。每筆資料帶系統維護的 `updatedAt`，讀取時帶回、編輯送出時附上讀取當下的值，後端比對不一致就回錯誤讓前端提示「已被修改，請重新整理」，而不是直接覆蓋。

> `id` 與 `updatedAt` 是每張表都有的系統欄位，由後端統一處理，個別 Schema 不列出。前端 `TableSchema` 比照辦理：用獨立的 `idColumn` 指出 ID 對應的表頭，不放進 `columns`；`coerceRow()` 固定把它轉成 row 物件的 `id`。

---

## 六、認證與權限

> 🔲 **尚未實作。** 後端還沒部署，這裡記的是部署時要怎麼設定。

單人使用，用 Google 帳號判斷是不是本人在操作（不是為了取得 Sheets API scope）：Apps Script 部署 Web App 時「Who has access」設為「Only myself」。Google 在程式碼執行前就完成把關，未登入正確帳號者會被導向 Google 登入頁。

注意：前端 `fetch()` 在未登入時，因跨網域重導至 `accounts.google.com`，拿到的通常是網路層級錯誤而不是乾淨的 401 JSON。對單人自用裝置這個限制感受不明顯。

---

## 七、離線可用性

> 🔲 **尚未實作。** `vite-plugin-pwa` 沒安裝，manifest 與 Service Worker 都還沒建立，App 名稱和圖示也還沒決定。

不做離線寫入，只做基本 PWA 安裝殼層快取：Service Worker 只快取靜態資源（App 可安裝、開啟瞬間有畫面），資料仍即時打 API，無網路時列表顯示「無法連線」。之後有需求再加離線寫入佇列（需要 IndexedDB、寫入佇列、衝突處理一整套，成本明顯較高）。

---

## 八、仿 AppSheet 的 UI 設計重點

- 頂部 App Bar + 漢堡選單開關的側邊欄外殼。左側圖示依當下路由自動切換漢堡選單／返回箭頭（用 router 累計的導覽次數判斷有沒有真正的 App 內上一頁，沒有就不顯示返回箭頭）
- 主要導覽用底部導覽列（項目來自 `config/navigation.ts`）；側邊欄先保留空殼。目前以手機版體驗為主，🔲 桌面版導覽 UI 待定（要不要改成側邊欄常駐、底部導覽列要不要在桌面隱藏）
- 卡片式列表為主，也支援表格式。列表頁用 `<KeepAlive>` 保留展開/捲動狀態（注意事項見 4.3）
- 長按列表項目進入多選模式，選取狀態一有內容就自動進入、清空就自動離開，不另外存 boolean
- 右下角 FAB：動作 ≤2 顆固定顯示，≥3 顆收合成 speed-dial
- App Bar 右側動作按鈕：頁面用 `useAppBarActions()` 註冊，≤2 顆直接顯示，≥3 顆收成「⋮」下拉。跟 FAB 不同，這裡走 **provide/inject** 而非 Teleport——app-bar 在轉場動畫的 `.page-transition-viewport` 之外，不會被 `transform` 影響，不需要真的搬 DOM
- FAB 與 App Bar 動作共用同一種 `PageAction` 型別 `{ key, label, icon, to?, onClick? }`。新增/編輯/刪除是每張表都有的通用動作，寫成共用 builder；每張表的 `use表名Actions.ts` 呼叫這些 builder 組出自己的動作集合，該表獨有的動作也加在那裡。頁面自己決定用哪幾個、放 FAB 還是 App Bar
- 頁面切換有前進/後退轉場動畫，方向依路徑深度自動判斷
