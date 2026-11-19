# 框架進度

此文件只追蹤**通用框架**的狀態。此專案自己的表與頁面見 [PROJECT-ROADMAP.md](PROJECT-ROADMAP.md)，該文件只存在於 production 分支。

設計說明見 [README.md](README.md)。

---

## 已完成

### 前端骨架
- Vue 3 + TypeScript + Vuetify，unplugin-vue-router 檔案式路由，Pinia
- 外殼：App Bar、底部導覽列、側邊欄。電腦版改為固定於左側、可收合的側邊欄。見 [topics/pages.md](vue-build/docs/topics/pages.md) 的「畫面的外殼」與 [NavDrawer](vue-build/docs/components/shell/NavDrawer.md)
- 換頁動畫，以及首次導覽後於背景下載所有頁面的程式。見 [topics/pages.md](vue-build/docs/topics/pages.md) 的「換頁動畫」
- KeepAlive 保留頁面的狀態，並還原捲動位置。見 [topics/pages.md](vue-build/docs/topics/pages.md) 的「KeepAlive 的規則」

### Schema 型別系統
- 欄位型別：`text`、`number`、`date`、`duration`、`boolean`、`ref`、`select`、`image`。`select` 的 `allowCustom`、`text` 的 `multiline`。見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「欄位」
- 讀寫的轉換：`coerceRow`、`serializeRow`、`formatColumnValue`。見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「Sheet 上的慣例」
- 主鍵：`idColumn` 與 `newId`，建立後不能修改。見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「主鍵」
- 欄位的順序：`detailOrder`、`formOrder`，頁面可以覆寫。`showIf` 依列決定是否顯示。見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「欄位呈現與其順序」
- 條件式格式：`formatRules`。見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「條件式格式」
- 虛擬欄位：`virtualColumns`，以及稱呼一列的 `labelColumn`。見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「欄位」與「row 上的 getter」
- `TableSchema<Row>`：各表帶入自己的 Row 介面，欄位 key 由 TypeScript 檢查
- 處理列的純函數置於 `schema/`：排序、分組、篩選、驗證、關聯、圖片。見 [architecture.md](vue-build/docs/architecture.md) 的「資料夾」

### 跨表關聯
- 由 `ref` 欄位自動產生關聯圖。store 於列上掛上父列與子列的 getter。見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「跨表關聯」
- 連帶刪除（`onDelete: 'cascade'`）、沒有子列時刪除父列（`onEmpty: 'delete'`）
- 選擇器的順序（`refSort`）、選擇器中新增父列（`allowCreate`）
- `ensureLoaded` 一併載入父表與子表

### 資料存取
- 每張表一份全 App 共用的快取，第一次位於須登入的頁面時於背景載入所有的表。見 [topics/store.md](vue-build/docs/topics/store.md) 的「讀取」
- 寫入經過 store 的 `create`、`update`、`remove`、`removeMany`，修改快取並進入佇列。見 [topics/store.md](vue-build/docs/topics/store.md) 的「寫入」
- 新增的 id 由前端決定。見 [topics/store.md](vue-build/docs/topics/store.md) 的「新增的 id 由前端決定」
- `notify()`：全 App 共用的 snackbar。見 [topics/pages.md](vue-build/docs/topics/pages.md) 的「畫面的外殼」

### 累積寫入
- 修改先累積於前端的佇列，使用者按同步時才以一個請求寫入，全有全無。見 [topics/store.md](vue-build/docs/topics/store.md) 的「推送與同步」
- 同步按鈕：推送後重新抓取。未推送時有圓點標記，關閉分頁前攔截。表單層開啟時停用
- 流程存檔點：`beginFlow`、`commitFlow`、`rollbackFlow`。見 [topics/store.md](vue-build/docs/topics/store.md) 的「流程存檔點」
- 佇列只存於記憶體

### 共用元件庫
- 列表：`DataList`、`DataProfile`、`DataCard`、`DataGallery`、`DataTable`、`GroupedList`、`ListLayout`、`ListField`、`CountLabel`
- 詳細：`DataDetail`、`DetailField`、`DetailHeader`、`InlineField`、`RecordNav`
- 表單：`DataForm`、`FieldInput`
- 整頁版型：`PageState`、`DetailPage`、`ListPage`、`ChildList`、`ChartPage`
- 頁籤與儀表板：`TabPage`、`DashboardPage`、`DashboardPanel`
- 其他：`ViewActions`、`PageFab`、`AppDialog`、`ConfirmDialog`、`FieldsDialog`、`FormattedValue`
- 子表區塊的「展開」是一個真正的頁面。見 [ChildList](vue-build/docs/components/page/ChildList.md)
- 各元件的用法見 [vue-build/docs/components/](vue-build/docs/components/)，外觀與用途見 [vue-build/docs/design/](vue-build/docs/design/)

### 頁面類型（對照 AppSheet）

| AppSheet | 此框架的名稱 | 現況 |
| --- | --- | --- |
| deck | **deck** | ✅ `DataList`，每一列的動作按鈕為 `ViewActions` |
| table | **table** | ✅ `DataTable` |
| detail | **detail** | ✅ `DetailPage`，選用的標頭區塊為 `DetailHeader` |
| form | **form** | ✅ 表單層，見 [vue-build/docs/topics/pages.md](vue-build/docs/topics/pages.md) 的「表單層」 |
| card（小） | **profile** | ✅ `DataProfile` |
| card（大） | **card** | ✅ `DataCard` |
| gallery | **gallery** | ✅ `DataGallery` |
| chart | **chart** | ✅ `ChartPage`、`DataChart`、`DataStat`，見 [vue-build/docs/topics/chart.md](vue-build/docs/topics/chart.md) |
| dashboard（分頁） | **tab** | ✅ `TabPage` |
| dashboard（全部顯示、連動） | **dashboard** | ✅ `DashboardPage`、`DashboardPanel`，見 [vue-build/docs/design/dashboard.md](vue-build/docs/design/dashboard.md) |
| calendar | — | 暫不考慮。把資料當成事件放上日曆，通常依日期與時間欄位 |
| map | — | 暫不考慮。把座標標在 Google 地圖上 |
| onboarding | — | 暫不考慮。導覽頁 |

- **視圖（view）**：deck、profile、card、gallery 與詳細頁的標頭，共用同一套「欄位與位置的對應」，實作於 `schema/view.ts`。view 定義於頁面，schema 本身不含 view。說明見 [vue-build/docs/components/list/DataList.md](vue-build/docs/components/list/DataList.md) 與 [DataCard.md](vue-build/docs/components/list/DataCard.md)

### 搜尋、篩選與排序
- 表層級的 `searchable`、`sortable` 清單，真實欄位與虛擬欄位皆可列入
- 搜尋列：App Bar 的放大鏡，比對 `text` 與 `ref` 欄位。見 [topics/search.md](vue-build/docs/topics/search.md) 的「搜尋」
- 篩選抽屜：兩層，一頁可以有多張表的條件。見 [topics/search.md](vue-build/docs/topics/search.md) 的「篩選」
- 排序面板：一次依一欄排序，`defaultSort` 為次要排序。見 [topics/search.md](vue-build/docs/topics/search.md) 的「排序」

### 動作系統
- `PageAction`：FAB、App Bar、欄位動作共用的描述。見 [topics/actions.md](vue-build/docs/topics/actions.md) 的「PageAction」
- 內建的 builder，以及各表的 `use表名Actions`。見 [topics/actions.md](vue-build/docs/topics/actions.md) 的「內建 builder 一覽」與「各表的 use表名Actions」
- 欄位動作與列上的動作。見 [topics/actions.md](vue-build/docs/topics/actions.md) 的「欄位動作」與「列上的動作」
- 須確認的動作只要宣告 `confirm`。見 [topics/actions.md](vue-build/docs/topics/actions.md) 的「執行」
- `confirm()` 與 `choose()` 共用的對話框。見 [ConfirmDialog](vue-build/docs/components/dialog/ConfirmDialog.md)
- `askFields()` 與快速編輯對話框。見 [topics/actions.md](vue-build/docs/topics/actions.md) 的「快速編輯對話框」

### 表單與多選
- 表單層：蓋在目前頁面上的一層，`openForm` 與 `askFields()`。見 [topics/pages.md](vue-build/docs/topics/pages.md) 的「表單層」
- 新增表單的初始值。見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「新增表單的初始值」
- 前端驗證：`validateRow`。見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「驗證」
- 長按多選與多選的出口，離開頁面或頁籤即取消選取。見 [topics/pages.md](vue-build/docs/topics/pages.md) 的「多選與頁籤」
- 列表頁的資料層：`useListPage`。見 [ListPage](vue-build/docs/components/page/ListPage.md)

### 連續動作
- 流程：`runFlow`、`runStep`，離開步驟即回滾。見 [topics/actions.md](vue-build/docs/topics/actions.md) 的「連續動作（流程）」
- 離開表單前的詢問。見 [topics/pages.md](vue-build/docs/topics/pages.md) 的「離開表單前的詢問」
- 範本 `table/use__Table__Actions.ts` 的末尾有寫法示範

### 路由
- 登入頁與導向（`config/app.ts` 的 `authMethod` 不是 `'none'` 時）。見 [docs/auth.md](docs/auth.md)
- `useRouteId()`：路由參數讀取一次即固定。見 [topics/pages.md](vue-build/docs/topics/pages.md) 的「KeepAlive 的規則」
- `leaveAfterAction()`：完成動作後以瀏覽器的返回離開。見 [topics/pages.md](vue-build/docs/topics/pages.md) 的「完成動作後的導覽」
- 詳細頁的上一列、下一列依列表畫面上的順序。見 [RecordNav](vue-build/docs/components/record/RecordNav.md)

### 後端的對接層與假後端
- `services/appScript.ts` 為對後端唯一的出入口。未設定 `VITE_APPS_SCRIPT_URL` 時使用假後端，clone 後不填任何設定即可執行
- 假後端：記憶體中的資料表，讀取 `vue-build/mock/` 的 CSV，重新整理後回到原始內容
- 同時送出的請求有上限，超過的請求在前端排隊。見 [docs/api.md](docs/api.md) 的「共通」

### 後端（Apps Script）
- 程式位於 `apps-script/`，須填寫的只有 `Config.gs`。見 [apps-script/README.md](apps-script/README.md)
- 以 clasp 推送與重新部署。見 [apps-script/README.md](apps-script/README.md) 的「clasp 指令」
- 整張表的讀取、batch（鎖、衝突比對、全有全無）、表頭對應、結構完整性檢查，已對實際的 Sheet 完成測試。見 [apps-script/README.md](apps-script/README.md) 的「實測結果」
- 認證：以登入換取 token。見 [docs/auth.md](docs/auth.md)
- 前後端的介面。見 [docs/api.md](docs/api.md)

### 資料一致性
- 推送前比對試算表的 `modifiedTime`，衝突時詢問「放棄並重新抓取」或「強制推送」。見 [docs/api.md](docs/api.md) 的「資料一致性」與 [topics/store.md](vue-build/docs/topics/store.md) 的「衝突：Sheet 被別處修改」

### 列表效能
- 上千列的列表頁做過一輪渲染成本的處理。見 [vue-build/docs/perf.md](vue-build/docs/perf.md)

### 部署
- 前端的部署：以 Cloudflare Workers 託管，以 Cloudflare Access 限制可以開啟網站的人。見 [README.md](README.md) 的「前端的部署」

### 測試
- Vitest，`vue-build/tests/` 的結構對應 `src/`。純函數直接呼叫，store 與連動經由假後端。見 [architecture.md](vue-build/docs/architecture.md) 的「資料夾」
- 測試只用 `tests/fixtures/` 中的 schema，不連線至真正的後端

### 文件與範本
- 根目錄的 `README.md` 為索引。前端的文件在 `vue-build/docs/`，前後端之間的介面在 `docs/`
- 根目錄的 `AGENTS.md`：AI agent 的工作規則。`CLAUDE.md` 只匯入 `AGENTS.md`
- `vue-build/template/`：新增一張表所需的全套檔案。見 [vue-build/template/README.md](vue-build/template/README.md)

### 編輯器（第一階段）
- 於本機執行的網頁 App，只修改專案的檔案。說明見 [editor/docs/README.md](editor/docs/README.md)
- 依類型分組的導覽、檔案區、預覽、下方面板。導覽、預覽與下方面板皆可收合
- 按「儲存」才寫入。寫入時以 ESLint 修正格式，並檢查檔案是否已在別處修改
- 預覽：vue-build 的 dev server，可切換本地測試、線上測試與線上正式，顯示未儲存的內容
- 文字編輯器：CodeMirror，`.ts` 與 `.vue` 有即時的錯誤標示與補全
- 問題分頁：即時檢查、ESLint、vue-tsc、Vite 的錯誤。建置分頁、欄位查詢、控制台
- 表的表單：表的設定、欄位、搜尋與排序、條件式格式。說明見 [editor/docs/forms.md](editor/docs/forms.md)
- 欄位的結構修改：新增、刪除欄位，修改 key 與標籤，連帶修改其他檔案
- 表的總覽：順序、啟用與停用、新增與刪除表
- 測試資料：測試資料的總覽、建立 CSV、唯讀的 CSV 表格與表頭的比對

---

## 未完成

### 後端

- 🔲 **Google 登入**（前端 `authMethod: 'google'`）：使用同一套約定，Google 的 ID token 放進登入的 `credentials`，見 [docs/auth.md](docs/auth.md)
- 🔲 Hooks 機制（見 [docs/api.md](docs/api.md)）
- `bulkCreate`：等確實有匯入的需求時再處理

### Schema
- **可修改的 id**：等確實須修改 id 的情境再實作。須一併替換的地方見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「已知缺口」

### UI 功能
- **依顯示情境判斷的條件**（暫不實作）：比照 AppSheet 的 `CONTEXT()`，讓 schema 中以列判斷的函數以同一種方式取得情境，例如多一個 `context` 參數。現況見 [topics/schema.md](vue-build/docs/topics/schema.md) 的「已知缺口」
- **列表的預設排序由頁面覆寫**（等確實需要時再實作）：做法同 `order`，schema 的 `defaultSort` 作為預設，頁面經由 `useSortedTableList` 的參數覆寫

### 列表效能（剩下的部分）
- 🔲 見 [vue-build/docs/perf.md](vue-build/docs/perf.md) 的「尚未進行的部分」

### PWA 與離線
- 🔲 Service Worker 尚未建立。manifest 已建立。見 [topics/store.md](vue-build/docs/topics/store.md) 的「離線可用性」

### 部署
- API 配額用量的監控

### 編輯器
- 🔲 **第二階段**：
  - 關聯（`$ref` 的 getter）
  - `Config.gs` 的表單，以及與表的連動：新增表時登記於 `TABLES`，刪除表時刪除登記，主鍵的表頭隨欄位修改
  - 導覽（`navigation.ts`）的表單
  - 由範本新增頁面
  - mock 資料的編輯：於 CSV 的表格中修改格子，新增與刪除列
  - 唯讀的關聯圖：表之間的 `ref`，以及頁面之間的連結
