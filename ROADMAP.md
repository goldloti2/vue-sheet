# 框架進度

這份只追蹤**通用框架**的狀態。這個專案自己的表與頁面見 [PROJECT-ROADMAP.md](PROJECT-ROADMAP.md)（只存在於 production 分支）。

設計說明見 [README.md](README.md)。

---

## 已完成

### 前端骨架
- Vue 3 + TypeScript + Vuetify，unplugin-vue-router 檔案式路由，Pinia
- `AppShell`：頂部 App Bar（標題來自 `route.meta.title`）+ 底部導覽列 + 側邊欄空殼
- App Bar 左側圖示依路由自動切換漢堡選單／返回箭頭
- 頁面前進/後退轉場動畫，方向依「導覽列順序 → 回到頂層 → 同路由換 id 依列表順序 → 瀏覽器歷史前後」四層判定（見 README 八）
- 底部導覽列切換分頁用 `replace`，內頁不會堆進歷史
- `<KeepAlive :max="50">` 以 `route.fullPath` 為 key，保留列表的展開與捲動狀態；同時讓「同路由換 id」能觸發轉場動畫

### Schema 型別系統
- `SchemaColumn` / `TableSchema` 型別，`type` 支援 `text`／`number`／`date`／`ref`／`select`
- `coerceRow`（後端字串 → 前端型別）與 `serializeRow`（反向）
- `formatColumnValue` / `formatField` 顯示格式化
- `columnValues`（組送出用 payload）、`emptyRow`（新增表單起始值，套用欄位的 `default`）
- `sortRows`（依 `defaultSort`）、`sortByKey`、`groupRows`（多層分組）、`flattenGroups`（把分組攤回畫面順序）
- `detailOrder` / `formOrder` 分別控制詳細頁與表單頁的欄位順序
- `virtualColumns`：不在 Sheet 上、讀的時候才算的欄位，來源可以是自己這列或 `needs` 宣告的子表（`related()`）。store 掛成 row 上的 getter，顯示、排序、分組都跟真實欄位一樣；兩種欄位共用 `ColumnTypes`／`ColumnBase` 型別骨架
- `labelColumn`：一列怎麼稱呼（欄位 key，省略就是 id），store 掛成 `row.$label`
- `TableSchema<Row>`：各表宣告時帶自己的 Row 介面，欄位 key 與 `type` 對著它檢查，虛擬欄位 `value` 的 `row` 有型別；框架端用不帶參數的 `TableSchema`

### 跨表關聯
- `schema/relations.ts` 掃 schema 的 `ref` 欄位自動產生關聯圖，新增關聯只要標 `type: 'ref'`
- store 在每列掛每個 ref 欄位的 `$欄位key`（父列），`formatColumnValue` 遇到 ref 就顯示對方的 `$label`，所以 detail／表格／列表／選擇器全都顯示名字、沒有 ref 專用元件
- `DataForm` 的 `ref` 欄位是父表整表的可搜尋下拉清單（`v-autocomplete`），每列文字與搜尋比對都是對方的 `$label`；「前往對方」是欄位動作 `useGoToRefAction`，頁面自己列
- `ensureLoaded(table)` 會把 ref 指到的表和虛擬欄位 `needs` 的表一起載（擋循環）
- `useRelatedRows(子表, 父表)` 依關聯圖解析外鍵欄位，整表撈一次後在前端分組
- 連帶刪除：ref 欄位標 `onDelete: 'cascade'`，父列被刪時 `store.removeMany` 順著關聯圖把子列也刪掉（多層遞迴，走同一條 `patch`＋`enqueue`）；`ensureLoaded` 會把 cascade 的子表一起載

### 資料存取
- `stores/tables.ts`：每張表一份全 App 共用的快取，同一張表不會重複打 API
- `useTableList` / `useSortedTableList` / `useTableRow` / `useRelatedRows` 都讀同一份
- 寫入走 store 的 `create` / `update` / `remove` / `removeMany`：改快取並進佇列，呼叫端不用手動 refresh
- 待寫入佇列 `pending`（含合併規則）與手動推送；四個寫入 action 是同步的，只動快取與佇列
- `useNotify`：全 App 一則 snackbar 訊息，由 `AppShell` 渲染
- 新增的 id 由前端發：`newId` 是 schema 上的必填函式，格式由各表決定（`prefixedId('TPL')` 是現成的前綴式）。後端收到已存在的 id 就當作重送、回傳既有那筆
- 跨表算出來的值靠共用快取的 reactivity 自動重算，不需要跨表失效機制

### 累積寫入
改動先累積在前端，由使用者按「推送」才一次寫進 Sheet。設計與實作見 [README 4.2](README.md#42-資料流讀取與寫入)。
- 佇列 `pending`、合併規則、`flush`、`hasPending` / `flushing` / `flushError`
- 四個寫入 action 變成同步的，只動快取與佇列
- 流程存檔點 `beginFlow` / `commitFlow` / `rollbackFlow`（給連續動作用；流程進行中 `flush` 會被擋下）
- App Bar 最右側的同步鈕（`refresh()` ＝ 推送 + 重抓所有已載入的表）+ 未推送圓點標記（失敗轉紅）+ `beforeunload` 攔截
- 表單開著的時候同步鈕停用（`useSyncHold` 持有 `holdSync()`，`canSync` 判斷）
- flush 失敗保持「未推送」狀態並用 snackbar 報錯，讓使用者重按。因為 id 由前端發，整批重送是安全的——刻意**不做**「記錄哪幾筆成功了」的逐筆補償邏輯
- **重抓前一定先 flush**，沒清乾淨就不重抓；沒有「只重抓一張表」的 API
- 跨表寫入順序無所謂。Sheet 沒有外鍵約束，後端也不做合法性驗證，所以父表子表誰先寫都不會壞
- 目前 `flush` 是逐筆送 N 次請求，通用 batch 端點等接真後端時一起做（見「後端 API 介面」）
- 決定不做：**佇列持久化**。佇列只在記憶體，重整／當機／分頁被系統殺掉就會丟掉未推送的變更（`beforeunload` 只擋得住主動關分頁）。單人使用、推送就是一顆鈕，不值得。哪天要做的話：存 `localStorage`（`values` 進佇列時就已序列化，直接 `JSON.stringify`）、流程期間暫停寫入（磁碟上停在流程開始前的樣子，被殺掉再開等於自動回滾）；唯一貴的是開機後要把佇列重新疊回從後端抓來的 `rows`，需要一個部分欄位版的 `coerceRow`

### 共用元件庫
- 列表：`DataList`（卡片式單列，含長按多選）、`ListField`、`GroupedList`（多層可收合分組）、`DataTable`（表格式，也用於 detail 頁內嵌子表格；`columns` 可指虛擬欄位）
- 詳細：`DataDetail`（自帶 loading/error/找不到資料，虛擬欄位自動顯示）、`DetailField`
- 表單：`DataForm`（依 `column.type` 自動選輸入元件）
- 其他：`PageFab`、`TabView`、`RecordNav`、`AppDialog`、`ConfirmDialog`、`FieldsDialog`（只顯示幾欄的 `DataForm`）

### 動作系統
- `PageAction` 型別（`{ key, label, icon, onClick, confirm? }`），FAB、App Bar、底部動作列、detail 欄位動作共用同一種描述；內建 builder 的 label／icon 可用 `ActionLook` 覆寫
- 通用 builder：`useNewAction` / `useEditAction` / `useDeleteAction` / `useBulkDeleteAction` / `useQuickEditAction`，一律回傳 `ComputedRef<PageAction[]>`
- 欄位動作（`DataDetail` 的 `fieldActions`，一欄一個、整格可點）：`useGoToRefAction`（ref 前往對方）／`useOpenUrlAction`（開新分頁）／`useSetFieldAction`（立即改成某個值，可帶 confirm）
- 需要確認的動作宣告 `confirm` 就好，`useActionRunner` 先 `await confirm()` 再跑，錯誤進 snackbar；頁面不用擺 `ConfirmDialog`
- `confirm()` / `askFields()`：是／否與問幾個欄位的對話框，都是 module-level 狀態 + `AppShell` 掛一個實例 + promise；`useQuickEditAction` 用後者把選取的多筆改成同一個值（欄位由設計者定，只選一筆時顯示現值）
- 每張表的動作（含批次刪除）一律從 `use表名Actions(options)` 取，用不到的是空陣列
- `useAppBarActions()` 用 provide/inject 把動作註冊到 App Bar，數量多自動收成下拉選單
- `useBottomActions()` 把動作註冊到螢幕最底端，暫時取代導覽列（表單頁的取消／送出）；兩者共用 `useActionSlot` 的 KeepAlive 防護
- `PageFab` 依數量自動在固定顯示與 speed-dial 之間切換

### 表單與多選
- `useCreateForm` / `useEditForm` 收掉新增與編輯的重複邏輯（起始值、載入、送出、導覽、錯誤狀態）
- 新增表單的預設值三層：schema 的 `default` → `useNewAction` 經 `history.state` 帶來的 → `useCreateForm` 的參數
- `useMultiSelect` + `useLongPress`：長按進入多選，選取狀態由「有沒有選取任何一筆」推導
- 批次刪除走動作的 `confirm`

### 連續動作
設計與實作見 [README 4.4](README.md#44-完成動作後的導覽)。
- 流程存檔點 `beginFlow` / `commitFlow` / `rollbackFlow`：把一段流程的快取與佇列改動一次還原；套疊直接拋錯，流程進行中 `flush` 會被擋下
- `useFlow.ts`：`runFlow`（外殼：存檔點 + commit / rollback）、`runStep`（開表單等送出）、`resumeStep`（表單交棒）、`FlowCancelled`、`hasEarlierSteps`
- `router.afterEach` 中止等待中的步驟（reject）並回滾；`useCreateForm`／`useEditForm` 送出成功後先問 `resumeStep`
- 第一步 `push`、之後 `replace`
- 離開前先問：`useLeaveGuard` 的 `router.beforeEach`，返回鍵／導覽列／改網址／底部取消全走同一條；第二步之後一律問，否則看表單有沒有改動
- 範本 `table/use__Table__Actions.ts` 末尾有寫法示範；專案端的第一條流程見 production 分支的 PROJECT-ROADMAP
- 決定不做：
  - **返回＝回到上一步**（而不是整條取消）。代價是三件事加起來等於一個多頁精靈：每步改 `push` 且結束後要清歷史；存檔點要從一格變一疊（每步單獨收回）；上一步的表單要帶著使用者上次填的值重開。等真有三步以上、常態要回頭改的流程再說
  - **編輯表單的預設值通道**：`useEditForm` 不讀 `navigationDefaults()`，所以編輯表單可以當流程的一步，但沒辦法把上一步的結果預先填進去。目前想不到需要的情境
  - **進度指示**（第 1 步／共 2 步）：步驟頂多兩三步，每一步是完整的一頁、App Bar 上有自己的標題

### 路由
- `useRouteId()`：路由參數讀一次就固定（靠 `route.fullPath` 當 key 成立），離場動畫期間不會被目的地的 id 汙染。拿掉 key 時開發模式會警告
- `leaveAfterAction()`：完成動作後用瀏覽器返回離開，不把已完成的表單頁留在歷史裡
- `useListOrder` / `useSiblingNav`：列表頁發布畫面上的實際順序，detail 頁據此翻上/下一筆（箭頭 + 手勢），切換用 `replace`

### 假後端
- `services/mock/`：記憶體資料表 + 可運作的 create/update/delete/bulkUpdate，跟真 Sheet 一樣只存原始字串
- 純記憶體，重整頁面回到 CSV 原始內容
- `services/appScript.ts` 是對後端唯一的出入口，上線時只要換掉這兩個函式的主體、刪掉 `mock/`

### 範本
- `template/`：新增一張表所需的全套檔案 + 每個 UI 元件的用法說明

---

## 未完成

### 後端（完全還沒開始）
- Apps Script 的 `doGet`/`doPost` 入口與泛用 CRUD 引擎
- Schema.gs、SheetUtils.gs（header 對應、row array ↔ object；ID 改由前端產生，後端不發）
- Validation.gs：只做安全性與結構完整性（id 不重複、目標存在、表名與欄位名在 schema 內），不做合法性驗證
- Hooks 機制（見 README 4.7）
- 前端 `appScript.ts` 從假後端換成真的 fetch

### 後端 API 介面（已定案，還沒實作）

五個動作，單筆與批次成對：

| 動作 | payload | 回傳 |
| --- | --- | --- |
| `create` | `{ id, ...values }` | 新建那筆 |
| `update` | `{ id, ...values }` | 更新後那筆 |
| `delete` | `{ id }` | `{ id }` |
| `bulkUpdate` | `{ ids, data }` | 更新後的多筆 |
| `bulkDelete` | `{ ids }` | `{ ids }` |

- **ID 由前端產生**（`create` 的 payload 帶 id）。這讓重送變成冪等的：`create` 定義成「id 不存在就建、已存在就當作已完成」，整批重送是安全的，不需要記錄哪幾筆成功過。也讓待推送佇列可以直接用 `table + id` 當 key，因為不會出現「刪掉又新增同一個 id」
- 後端仍然要擋重複 id——Sheet 可以手動打開來改，不能假設 id 只由前端產生
- `bulkUpdate { ids, data }` 的語意是「多筆的指定欄位改成同一個值」。後端可以直接落到一次 `sheet.getRangeList([...]).setValue(...)`
- 前端目前只送 `create`／`update`／`delete`：佇列是逐筆的，快速編輯與批次刪除都拆成多個單筆操作進佇列（合併規則才適用）。`bulkUpdate`／`bulkDelete` 留在介面裡，等 batch 端點定下來再看要不要保留
- `bulkCreate`：等真的有匯入需求再說
- **累積寫入需要通用 batch 端點**（一次請求帶多個操作）。因為佇列裡每筆的值都不同，`bulkUpdate { ids, data }` 涵蓋不了，硬拆成 N 次 `update` 就失去批次的意義

> 註：每分鐘 60 次寫入是 Sheets REST API 的配額，用 Apps Script 內建的 `SpreadsheetApp` 並不適用。批次要省的是**每次 Web App 請求的 script 冷啟成本（約 0.5～2 秒）**，不是配額。

### 資料一致性
- **前端驗證**：form 層已完成（`schema/validation.ts` 的 `validateRow`＋`SchemaColumn` 上的 `required`／`min`／`max`，見 [README 4.5](README.md#45-schema-的角色)）。剩下的：
  - **store 寫入層還沒接**同一個 `validateRow`。寫入路徑已經定了（`create`／`update` 進佇列前），接上就好
  - 日期範圍、文字長度、正則格式都還沒有，等真的有需求再加進 `SchemaColumn`
- 驗證的分工已定案，見 [README 4.5](README.md#45-schema-的角色)：合法性只在前端做，一份 schema 推導出的驗證函式用在 form 層（即時提示）與 store 寫入層（擋程式 bug）兩處；後端只做安全性與結構完整性
- 樂觀鎖定：`updatedAt` 欄位與衝突提示都還沒做

### UI 功能
- 搜尋列、篩選、排序的操作介面（目前排序只有 schema 的 `defaultSort`，使用者不能自己改）。搜尋的「列 → 可搜尋文字」可以從 `row.$label` 起步，再看要不要多比對幾欄
- 關聯選擇器的 `allowCreate`：清單最上面一項「＋ 新增…」，開父表的新增表單、回來自動選上。看起來是 `runStep('/父表/new')`，但表單頁當「呼叫端」跟動作當呼叫端不一樣，四件事要先解：
  - 回來時 `useCreateForm` 的 `onActivated` 會把表單重置，使用者填到一半的東西會丟掉——要能分辨「從子步驟回來」和「重新進入」
  - 離開表單頁去開父表的新增會被 `useLeaveGuard` 攔下來問要不要放棄
  - 這張表單可能本身就是某條流程的一步（例如「新增父表接著新增子表」的第二步），`runFlow` 不能套疊，而且 `runStep` 在流程中會用 `replace`，把目前這張表單頁換掉
  - 完成後要回到原本那張表單（`back`），不是像流程一樣往前走
  - 等真的常用到再做；現在的替代路徑是先去父表新增、再回來選
- 圖片欄位與上傳（存 Google Drive）
- 總覽頁範本（`DataDashboardTemplate`）：保留了位置但沒有具體需求
- `TabView` 放多個獨立面板（例如兩張表的列表當成一組頁籤）目前只有內容層可用，動作層會壞掉。根源是兩個面板一旦都被看過就同時掛著（`v-window` 用 `v-show` 切換），而 FAB 與 App Bar 動作都假設同時只有一個頁面活著：
  - `useAppBarActions` 是單一 setter，後掛載的會蓋掉前面的，切頁籤也不會重新註冊
  - `PageFab` 靠 `onActivated`/`onDeactivated` 決定要不要 teleport，那是 `<KeepAlive>` 的 hook，`v-show` 切換不會觸發，於是兩顆 FAB 一起掛在 body 上
  - `useListOrder` 沒有 active 判斷，兩個面板都會把自己的順序發布到同一個 key、互相蓋掉，detail 頁的上/下一筆會跟著錯亂
  - 修法已定，等真的要寫這種頁面時再做：`TabView` 每個 `v-window-item` 裡包一層內部小元件 `TabViewPanel`，`provide` 一個 `computed(() => model === tab)`（provide 以元件為單位，要這一層才能每個頁籤各一份）；新增 `panelActiveKey`，`registerActions`、`PageFab`、`useListOrder` 各 `inject(panelActiveKey, ref(true))`，`isActive` 改成 `KeepAlive 狀態 && panel`、兩者都 watch。不在頁籤裡就是 `true`，現有頁面零改動。KeepAlive 巢狀是對的：頁面被快取時 Vue 對整棵子樹叫 `onDeactivated`。動的是 `TabView.vue`、`useActionSlot.ts`、`PageFab.vue`、`useListOrder.ts` 加一個放 key 的小檔，四五十行；文件補在 `TabView.md`，不另加頁面範本
  - **不同頁籤不同 FAB**：頁籤＝篩選的頁現在就做得到，頁面自己 `computed(() => 目前頁籤 === 'A' ? actionsA.value : actionsB.value)` 餵給 `PageFab`——FAB 是頁面掛的，頁面知道現在哪個頁籤。上面的修法解的是「面板自己掛自己的 FAB／動作」那種，兩者不衝突

### PWA 與離線
- manifest.json、Service Worker 都還沒建立（`vite-plugin-pwa` 未安裝）
- App 名稱、圖示都還沒決定
- 離線寫入佇列：明確決定不做，之後有需求再說

### 桌面版
- 桌面版導覽 UI 待定：要不要改成側邊欄常駐、底部導覽列要不要在桌面隱藏，等要做桌面體驗時再決定

### 部署
- 前端靜態託管（Vercel / Cloudflare Pages，注意 SPA fallback）
- 後端 Apps Script 部署與存取權限設定
- API 配額用量監控

---

## 已知的權宜作法

這些不是待辦，是「現在這樣做，但知道為什麼不理想」的紀錄。

- **`refTable`／`needs` 沒有型別檢查**：只存代稱字串，不保證真的存在於 `schemas`。為了避免 `schema/types.ts` 反向 import `schema/index.ts` 造成循環依賴，先接受
- **關聯只認「(子表, 父表)」這一對**：`getRelation`／`related('子表')`／`useRelatedRows` 都用表名找邊，同一張表若有兩個 ref 欄位指向同一張表（平行邊）只會走第一條。改法是以 ref 欄位為單位（`related('子表', '欄位key')`，只有一條邊時可省略），真的出現再改
- **`template/` 不在 `src/` 底下**，所以不會被 lint 與型別檢查掃到，元件 props 改了範本不會自動報錯。目前靠「把範本複製成一張暫時的表、建置過再刪掉」手動驗證
- **刪除時會閃一下「找不到這筆資料」**：快取更新後、返回動畫還在跑的期間，detail 頁的 row 已經是 null。因為那筆資料確實已經不存在，語意上可接受，所以沒有為它增加凍結顯示的機制
