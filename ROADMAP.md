# 框架進度

這份只追蹤**通用框架**的狀態。這個專案自己的表與頁面見 [PROJECT-ROADMAP.md](PROJECT-ROADMAP.md)（只存在於 production 分支）。

設計說明見 [README.md](README.md)。

---

## 已完成

### 前端骨架
- Vue 3 + TypeScript + Vuetify，unplugin-vue-router 檔案式路由，Pinia
- `AppShell`：頂部 App Bar（標題來自 `route.meta.title`）+ 底部導覽列 + 側邊欄（目前只有登出）。`meta.shell: false` 的頁面三者都不顯示
- App Bar 左側圖示依路由自動切換漢堡選單／返回箭頭
- 頁面前進/後退轉場動畫，方向依「導覽列順序 → 回到頂層 → 同路由換 id 依列表順序 → 瀏覽器歷史前後」四層判定（見 [vue-build/docs/ui.md](vue-build/docs/ui.md)）。方向是掛在轉場容器上的 `data-dir`，`<Transition>` 的 `name` 固定——這樣才避得開 `KeepAlive` 讓離場套到上一次方向的坑（見 [vue-build/docs/architecture.md](vue-build/docs/architecture.md) 的設計取捨）
- 底部導覽列切換分頁用 `replace`，內頁不會堆進歷史
- `<KeepAlive :max="50">` 以 `route.fullPath` 為 key，保留列表的展開狀態與頁面裡的其他元件狀態；同時讓「同路由換 id」能觸發轉場動畫
- 捲動位置還原：視窗的捲動位置不是元件狀態，KeepAlive 管不到，所以 router 自己記一份 `fullPath → scrollY`（`beforeEach` 存、`scrollBehavior` 還原，上限同 KeepAlive 的 50 筆）。返回鍵優先用瀏覽器自己記的 `savedPosition`；沒看過的頁面一律從頂端開始（以前是停在上一頁的位置）

### Schema 型別系統
- `SchemaColumn` / `TableSchema` 型別，`type` 支援 `text`／`number`／`date`／`duration`／`ref`／`select`／`image`
- `coerceRow`（後端字串 → 前端型別）與 `serializeRow`（反向）
- `formatColumnValue` / `formatField` 顯示格式化
- `columnValues`（組送出用 payload）、`emptyRow`（新增表單起始值，套用欄位的 `default`）
- `sortRows(rows, schema, sort?)`（使用者選的排序在前、`defaultSort` 接在後面當 tiebreaker）、`sortableColumns`、`sortByKey`（`schema/sort.ts`）；`groupRows`（多層分組）、`flattenGroups`（把分組攤回畫面順序）在 `schema/group.ts`
- **`schema/` 放對 row 做事的純函數**（`types`／`sort`／`group`／`filter`／`validation`／`relations`／`image`），不碰 reactivity，所以 store、元件、composable 都能直接叫；`composables/data/` 只放反應式包裝（`useTable`／`useSearch`／`useFilter`）。各表的欄位定義在 `schema/tables/`（一張表一個檔），註冊表 `schema/index.ts` 留在根目錄當公開入口
- `detailOrder` / `formOrder` 分別控制詳細頁與表單頁的欄位順序
- `virtualColumns`：不在 Sheet 上、讀的時候才算的欄位，來源可以是自己這列、父列（`row.$欄位key`）或子列（`row.$子表_欄位key`）。store 掛成 row 上的 getter，顯示、排序、分組都跟真實欄位一樣；兩種欄位共用 `ColumnTypes`／`ColumnBase` 型別骨架
- `labelColumn`：一列怎麼稱呼（欄位 key，省略就是 id），store 掛成 `row.$label`
- `TableSchema<Row>`：各表宣告時帶自己的 Row 介面，欄位 key 與 `type` 對著它檢查，虛擬欄位 `value` 的 `row` 有型別；框架端用不帶參數的 `TableSchema`
- `duration` 欄位：一段長度（不是時間點），值是 `"時:分:秒"` 字串、時數不設上限（`30:15:45` 合法），Sheet 上就是 `2:30:00`；讀進來容忍 `H:mm`（秒補 00）與 `H:mm:ss`。表單是一般文字框（原生 `type="time"` 塞不下超過 24 小時），排序與篩選都換算成秒再比（篩選是最短／最長的範圍）。🔲 「幾點幾分」的時間點型別還沒有，需要再加
- `date` 讀進來時歸零到當天午夜：Sheet 上手動加了時間也不會讓看起來一樣的兩列排序或篩選不一樣
- `image` 欄位：一格一張，值是行內 SVG、圖片網址、或 Google Drive 的檔案 id／分享連結，由 `schema/image.ts` 的 `imageSrc()` 依內容判斷後轉成 `<img src>`（Drive 走 thumbnail 端點、沿用瀏覽器的 Google 登入；SVG 轉 `data:` URI，當成圖片載入就不能執行 script）。詳細頁自動顯示，列表縮圖由頁面傳 `DataList` 的 `image` prop，表單是純文字欄位；不進搜尋與篩選。上傳到 Drive 還沒做
- `select` 的 `allowCustom`：`options` 只當建議清單，表單變 `v-combobox`、打別的字也收、驗證跳過選項檢查；資料形狀還是一個字串，顯示與篩選不用知道差別。再開 `suggestFromData`，建議清單接上資料裡用過的值（`options` 在前，多出來的依次數再依字串；跟篩選抽屜共用 `presentValues`）

### 跨表關聯
- `schema/relations.ts` 掃 schema 的 `ref` 欄位自動產生關聯圖，新增關聯只要標 `type: 'ref'`
- store 在每列掛每個 ref 欄位的 `$欄位key`（父列），`formatColumnValue` 遇到 ref 就顯示對方的 `$label`，所以 detail／表格／列表／選擇器全都顯示名字、沒有 ref 專用元件
- `DataForm` 的 `ref` 欄位是父表整表的可搜尋下拉清單（`v-autocomplete`），每列文字與搜尋比對都是對方的 `$label`；「前往對方」是欄位動作 `useGoToRefAction`，頁面自己列
- store 也在每張父表的列掛 `$子表_欄位key`（指向這列的子列陣列，照子表 `defaultSort` 排），零設定；虛擬欄位與頁面直接讀它，不用另外查。名字帶 ref 欄位，所以同一張子表兩個 ref 指向同一張父表（平行邊）各自一個 getter，不會撞
- `ensureLoaded(table)` 會把父表與子表一起載（擋循環）
- 連帶刪除：ref 欄位標 `onDelete: 'cascade'`，父列被刪時 `store.removeMany` 順著關聯圖把子列也刪掉（多層遞迴，走同一條 `patch`＋`enqueue`）；`ensureLoaded` 會把 cascade 的子表一起載

### 資料存取
- `stores/tables/`：每張表一份全 App 共用的快取，同一張表不會重複打 API
- `useTableList` / `useSortedTableList` / `useTableRow`（同一個 `data/useTable.ts`）都讀同一份
- 寫入走 store 的 `create` / `update` / `remove` / `removeMany`：改快取並進佇列，呼叫端不用手動 refresh
- 待寫入佇列 `pending`（含合併規則）與手動推送；四個寫入 action 是同步的，只動快取與佇列
- `notify()`：全 App 一則 snackbar 訊息，由 `AppShell` 渲染（跟 `confirm()` 一起放在 `shell/useDialogs.ts`）
- 新增的 id 由前端發：`newId` 是 schema 上的必填函式，格式由各表決定（`prefixedId('TPL')` 是現成的前綴式）。後端收到已存在的 id 就當作重送、回傳既有那筆
- 跨表算出來的值靠共用快取的 reactivity 自動重算，不需要跨表失效機制

### 累積寫入
改動先累積在前端，由使用者按「推送」才一次寫進 Sheet。設計與實作見 [vue-build/docs/store.md](vue-build/docs/store.md)。
- 佇列 `pending`、合併規則、`flush`、`hasPending` / `flushing` / `flushError`
- 四個寫入 action 變成同步的，只動快取與佇列
- 流程存檔點 `beginFlow` / `commitFlow` / `rollbackFlow`（給連續動作用；流程進行中 `flush` 會被擋下）
- App Bar 最右側的同步鈕（`refresh()` ＝ 推送 + 重抓所有已載入與載入失敗的表）+ 未推送圓點標記（失敗轉紅）+ `beforeunload` 攔截
- 表單開著的時候同步鈕停用（`useSyncHold` 持有 `holdSync()`，`canSync` 判斷）
- flush 失敗保持「未推送」狀態並用 snackbar 報錯，讓使用者重按。因為 id 由前端發，整批重送是安全的（所以沒有逐筆補償，見「決定不做」）
- **重抓前一定先 flush**，沒清乾淨就不重抓；沒有「只重抓一張表」的 API
- 跨表寫入順序無所謂。Sheet 沒有外鍵約束，後端也不做合法性驗證，所以父表子表誰先寫都不會壞
- `flush` 把整個佇列（跨所有表）攤平成一串 operations，**一個請求送完、全有全無**：成功才清空佇列，失敗原封不動讓使用者重按（見 [docs/api.md](docs/api.md)）
- 佇列只在記憶體、不寫進 `localStorage`（決定不做的理由與代價見「決定不做」）

### 共用元件庫
- 列表：`DataList`（卡片式單列，含長按多選）、`ListField`、`CountLabel`（名稱 + 筆數的小標籤，分組標題與子表區塊共用）、`GroupedList`（多層可收合分組，標題帶筆數）、`DataTable`（表格式，也用於 detail 頁內嵌子表格；`columns` 可指虛擬欄位）
- 詳細：`DataDetail`（欄位區，虛擬欄位自動顯示）、`DetailField`
- 表單：`DataForm`（依 `column.type` 自動選輸入元件）
- 整頁版型：`PageState`（載入中／載入失敗／找不到資料，全 App 唯一一份，資料到手才畫 slot）、`FormPage`（新增／編輯頁，內部包 `PageState`，另外處理送出失敗）、`DetailPage`（詳細頁：欄位區 + 左右滑動換筆 + 上下筆箭頭 + FAB）、`ListPage`（列表頁：逐列渲染卡片、`#rows` slot 整批給表格、或 `groups` 交給 `GroupedList`，加上 FAB 與發布列表順序，分組時先 `flattenGroups`）、`ChildList`（詳細頁裡的子表區塊：標題帶筆數、顯示上限、空狀態，右下角一列「展開」與頁面給的動作）。這些都是泛型元件，slot 的 `row` 帶著呼叫端的 Row 型別
- 詳細頁的順序分工：欄位照 schema 的 `detailOrder`，區塊（`ChildList` 之類）照頁面的 slot——`#top` 在欄位上面、default 在下面。插在特定欄位中間刻意不支援，那種版面直接不用 `DetailPage`（它的 template 只有二十行，零件都是現成的）
- 子表區塊的「展開」是**一個真的頁面**（`/父表/:id/子表`，範本 `template/pages/child-list.vue`，一條關聯一份、約 20 行），不是就地展開版面。這樣返回鍵、轉場、App Bar 標題都是現成的，而且 `ListPage` 會發布這份順序——從父列底下點進某一筆，上／下一筆走的是同一個父列的子列
- 狀態只在兩個地方出現：產生它的 composable，和畫它的 `page/` 那層版型。`DataList`／`DataForm`／`DataDetail` 這些內容元件都不碰 loading／error
- 其他：`PageFab`、`TabView`、`RecordNav`、`AppDialog`、`ConfirmDialog`、`FieldsDialog`（只顯示幾欄的 `DataForm`）
- `TabView` 的頁籤列登記給 `AppShell` 畫在 App Bar 的 extension，所以固定在最上面；每個頁籤外面包一層 `TabViewPanel`，`provide` 一份「我是不是當前頁籤」（`panelActiveKey`）。看過的面板會一直掛著（`v-window` 用 `v-show` 切），而 `PageFab`、`registerSlot`（App Bar／底部動作）、`useListOrder` 的「活著」判斷都是 `KeepAlive 狀態 && 當前面板`，所以一個頁籤放一整張表的列表、各自掛自己的 FAB 與動作是可以的。不在 `TabView` 裡就一律算當前，現有頁面零改動。動作那兩個 watch 刻意分成 `pre`（讓場的清）與 `post`（進場的設），同一輪切換時順序才不會反過來變成空的

### 搜尋、篩選與排序
- **哪些欄位能搜尋、能排序是表層級的 key 清單**（`searchable: ['name', 'date', …]`／`sortable: [...]`，真實與虛擬欄位都能列），跟 `detailOrder`／`formOrder`／`defaultSort` 同一種形狀；欄位本身只描述資料（key／label／型別／必填／選項／驗證）。**清單的順序就是篩選抽屜與排序面板上的順序**，型別是 `RowKey<Row>[]`，打錯 key TS 會擋
- `searchable` 一份清單管兩件事：`text`／`ref` 是搜尋列的比對對象，`select`／`number`／`date`／`duration` 是篩選抽屜的欄位
- `useSearch(query, rows, schema)`：純函數式，每列的可搜尋文字（searchable 欄位的顯示文字接起來、小寫）只跟 rows 一起重算，敲字只做 `includes`；query 依空白切詞、雙引號包起來的當一個詞，每個詞都要命中（AND）
- `useFilter(filters, rows, schema)`：`Filters = { 欄位key: { values?, min?, max? } }`，select 用 `values`（`null` 是空白）、number／date 共用 `min`／`max`；欄位之間 AND、`values` 之間 OR；設了範圍而值是空的列排除、select 只有勾了空白才留
- **query 與 filters 都屬於頁面**：`useListControls(query, { tables, current? }?)` 登記後 App Bar 才出現放大鏡，按下去整條換成輸入框；給了 tables 就在輸入框內最右多一顆篩選鈕（有條件生效時主色），開右側抽屜（抽屜歸 `AppShell`，內容是 `FilterPanel`），改了即時生效。← 關閉清掉 query 與所有表的篩選、換頁自動收起、回到還帶著 query 或篩選的頁面自動重開；抽屜開著時 `PageFab` 讓開（`useOverlay` 的 `overlayOpenKey`）。左右兩個抽屜都設 `order="-1"`，連 scrim 一起蓋在 App Bar 之上（Vuetify 的 layout 是 `z-index = 1000 + 層數×2 − 註冊順序×2`，越早註冊越上層，順序由 `order` 決定），所以抽屜開著時搜尋列與右上的鈕都碰不到。頁面串法 `rows → useFilter → useSearch → 頁籤切`，跨所有頁籤
- **一頁可以有好幾張表的條件**：`tables: [{ schema, filters, rows }, …]` 每張表各自一份 `Filters`、同時生效（頁籤各接一張表時，每個面板各用自己那份過濾）；query 則是全頁共用一份。抽屜第一層上方多一排表的 chip 決定現在編哪一張，`current`（頁面的頁籤 v-model，值對得上 `tableLabel`）決定打開時停在哪張，使用者仍可自己切。「清除」只清當前那張，← 關閉搜尋才是全部清掉。單表頁 `tables` 給一個元素，看不到 chip、行為跟以前一樣
- 抽屜分兩層：第一層是可篩選欄位的清單（順序就是 `searchable` 清單的順序，跳過歸搜尋列的 `text`／`ref`），有條件的欄位名稱底下用小字顯示現在篩什麼、右側一個主色圓點；第二層是單一欄位的值——select 是一列一項的 checkbox（只列 rows 裡出現過的值，照 `options` 順序、`options` 沒有的排最後、有空的才有「(空白)」並排在最後），number／date／duration 是兩格範圍
- 只為搜尋存在的虛擬欄位（例如父表把所有子列的名字接起來）照常宣告、列進 `searchable`，不排進 `detailOrder` 就不會顯示
- **排序**：列進 `sortable` 的欄位才出現在排序面板，順序就是清單的順序（跟 `searchable` 分開兩份，備註這種長文字不用排；`image` 列了也會跳過）。`useListPage` 順手登記，所以列表頁零設定，App Bar 放大鏡右邊多一顆排序鈕（非預設排序時主色）。**一次只排一欄**：點一欄選它、再點同一欄換升降，`defaultSort` 永遠接在後面當 tiebreaker；toolbar 的「清除」回到只照 `defaultSort` 排（位置與外觀跟篩選那顆一樣）。即時生效、重整回預設（不持久化）
- 排序面板 `SortPanel` 跟 `FilterPanel` **共用同一個右側抽屜**（`AppShell` 的 `drawerMode`），一次只顯示一種——抽屜蓋住 App Bar，要換另一種一定得先關掉，所以互斥不用寫邏輯擋；兩個面板上方的表 chip 是共用的 `TableChips`
- 比較方式兩個型別是特例：`ref` 照對方的 `$label`（值是 id，照 id 排沒意義）、`select` 照 `options` 的宣告順序（狀態有先後，字典序不對），`options` 沒有的值排最後
- **排序與分組二選一**，框架不介入：分組會把原本的順序壓成組內順序，所以頁面自己在 `sort` 不是 null 時把 `groups` 換成 `rows`（有分組的列表頁就是這樣）。排序一改，`ListPage` 發布的列表順序跟著改，詳細頁的上下一筆自動一致

### 動作系統
- `PageAction` 型別（`{ key, label, icon, onClick, confirm? }`），FAB、App Bar、底部動作列、detail 欄位動作共用同一種描述；內建 builder 的 label／icon 可用 `ActionLook` 覆寫
- 通用 builder：`useNewAction` / `useEditAction` / `useDeleteAction` / `useBulkDeleteAction` / `useQuickEditAction`，一律回傳 `ComputedRef<PageAction[]>`
- 欄位動作（`DataDetail` 的 `fieldActions`，一欄一個、整格可點）：`useGoToRefAction`（ref 前往對方）／`useOpenUrlAction`（開新分頁）／`useSetFieldAction`（立即改成某個值，可帶 confirm）
- 需要確認的動作宣告 `confirm` 就好，`useActionRunner` 先 `await confirm()` 再跑，錯誤進 snackbar；頁面不用擺 `ConfirmDialog`
- `confirm()` / `choose()` / `askFields()`：是／否、幾條出路（回傳按下去那顆的 key，取消是 `null`）、問幾個欄位；都是 module-level 狀態 + `AppShell` 掛一個實例 + promise，前兩個共用同一個 `ConfirmDialog`；`useQuickEditAction` 用後者把選取的多筆改成同一個值（欄位由設計者定，只選一筆時顯示現值）
- 每張表的動作（含批次刪除）一律從 `use表名Actions(options)` 取，用不到的是空陣列
- `useAppBarActions()` 用 provide/inject 把動作註冊到 App Bar，數量多自動收成下拉選單
- `useBottomActions()` 把動作註冊到螢幕最底端，暫時取代導覽列（表單頁的取消／送出）；兩者共用 `useActionSlot` 的 KeepAlive 防護
- `PageFab` 依數量自動在固定顯示與 speed-dial 之間切換

### 表單與多選
- `useCreateForm` / `useEditForm` 收掉新增與編輯的重複邏輯（起始值、載入、送出、導覽、錯誤狀態），取消／送出也由它們自己掛上底部動作列，頁面只剩「這是哪張表」
- 新增表單的預設值三層：schema 的 `default` → `useNewAction` 經 `history.state` 帶來的 → `useCreateForm` 的參數
- 前端驗證：`schema/validation.ts` 的 `validateRow`（內建 `required`／`min`／`max`／`select` 選項，其他規則由欄位的 `validate(value, row)` 自訂）一份，form 層與 `askFields` 送出前逐欄提示、store 的 `create`／`update` 寫入前再擋一次（拋錯、不動快取）；後端只做結構完整性，分工見 [vue-build/docs/schema.md](vue-build/docs/schema.md)
- `useMultiSelect` + `useLongPress`：長按進入多選，選取狀態由「有沒有選取任何一筆」推導；`itemProps(id)` 是每列要綁的那一包（`selectable`／`selectMode`／`selected`／長按與點選），列表元件與分組列表共用同一份
- 分組或分頁籤的列表也走 `ListPage`：一個頁籤一個 `ListPage`，各自算狀態、FAB 與列表順序，靠面板訊號決定哪份生效，頁面不用知道當前是哪個頁籤
- 列表頁的資料層 `useListPage(table, schema)`：整表 → 排序 → 篩選 → 搜尋（順手登記 App Bar 的放大鏡與排序鈕）＋ 多選，一次回傳（含 `sort`，頁面用它決定還要不要分組）；一頁接好幾張表時傳 `search: false`，改由頁面自己登記，再傳 `query` 讓每張表共用同一條搜尋字串
- 多選的出口：`useMultiSelect` 把「怎麼退出」登記到 `appBarSelectionKey`（只給一個函式，按鈕長怎樣歸 `AppShell`，跟放大鏡同一種分工），頁面零設定。那顆鈕釘在同步鈕左邊、**不收進「⋮」**（收進去就沒有明顯出口），而且「有沒有登記」就是「現在是不是多選模式」——多選時搜尋鈕先讓位，把空間留給對選取項目的動作
- 離開就取消選取：`onDeactivated`（KeepAlive 的列表換頁時）與 `useCurrentTab()`（換頁籤時）自動清，頁面零設定。頁籤訊號取自 `TabView` 登記給 `AppShell` 的那份，頁面層與面板層讀到同一個，所以兩種頁籤形狀不用各寫一套
- 批次刪除走動作的 `confirm`

### 連續動作
設計與實作見 [vue-build/docs/architecture.md](vue-build/docs/architecture.md)。
- 流程存檔點 `beginFlow` / `commitFlow` / `rollbackFlow`：把一段流程的快取與佇列改動一次還原；套疊直接拋錯，流程進行中 `flush` 會被擋下
- `useFlow.ts`：`runFlow`（外殼：存檔點 + commit / rollback）、`runStep`（開表單等送出）、`resumeStep`（表單交棒）、`FlowCancelled`、`hasEarlierSteps`
- `router.afterEach` 中止等待中的步驟（reject）並回滾；`useCreateForm`／`useEditForm` 送出成功後先問 `resumeStep`
- 第一步 `push`、之後 `replace`
- 離開前先問：`useLeaveGuard` 的 `router.beforeEach`，返回鍵／導覽列／改網址／底部取消全走同一條；第二步之後一律問，否則看表單有沒有改動
- 範本 `table/use__Table__Actions.ts` 末尾有寫法示範；專案端的第一條流程見 production 分支的 PROJECT-ROADMAP
- 三件刻意不做的（返回＝回到上一步、編輯表單的預設值通道、進度指示）見「決定不做」

### 路由
- 登入頁與導向（`config/app.ts` 的 `authMethod` 不是 `'none'` 時）：全域 guard 連第一次開啟都會檢查，沒有 token 就轉到 `/login?redirect=…`，登入後回到原本要去的地方；側邊欄可登出。每個請求帶 token，後端回過期或無效時清掉 token、回到登入頁，重新登入後重抓用過的表（含載入失敗的，不推送）。尚未完成的部分見「未完成」的「後端」
- `useRouteId()`：路由參數讀一次就固定（靠 `route.fullPath` 當 key 成立），離場動畫期間不會被目的地的 id 汙染。拿掉 key 時開發模式會警告
- `leaveAfterAction()`：完成動作後用瀏覽器返回離開，不把已完成的表單頁留在歷史裡
- `useListOrder` / `useSiblingNav`：列表頁發布畫面上的實際順序，detail 頁據此翻上/下一筆（箭頭 + 手勢），切換用 `replace`

### 後端的對接層與假後端
- `services/mock/`：記憶體資料表 + 可運作的 batch（create／update／delete，全有全無），跟真 Sheet 一樣只存原始字串
- 純記憶體，重整頁面回到 CSV 原始內容
- `services/appScript.ts` 是對後端唯一的出入口，**真的 fetch 已經寫好**（GET 讀整張表、POST 送 batch、拆 `{ success }` 信封、認 `code: 'modified'` 轉成 `ConflictError`）。`VITE_APPS_SCRIPT_URL` 沒設就走假後端，所以 clone 下來不填東西就能跑；真後端穩定後整個 `mock/` 可以刪掉
- POST 的 `Content-Type` 刻意是 `text/plain`（原因見 [docs/api.md](docs/api.md)）

### 後端（Apps Script）

程式在 `apps-script/`，需填寫的僅有 `Config.gs`：試算表 id、「表代稱 → 分頁名稱 + ID 欄表頭」的對照、表頭列號。細節、部署步驟與實測結果見 [apps-script/README.md](apps-script/README.md)。

- 已實作並於 **2026-10-02 對實際的 Sheet 完成測試**：入口與信封、整表讀取、batch（鎖、衝突比對、全有全無）、表頭對應、結構完整性檢查。實作規則、值寫入儲存格的行為與實測結果見 [apps-script/README.md](apps-script/README.md)；字串轉義由前端處理，見 [vue-build/docs/schema.md](vue-build/docs/schema.md)
- 認證：`Config.gs` 的 `AUTH` 啟用時，登入換 token（加鹽的 SHA-256 比對帳密、HMAC 簽章、30 天效期、剩不到一半自動續期），每個請求先驗 token 才開試算表。設計見 [docs/auth.md](docs/auth.md)
- 前後端介面（GET 整張表、POST 一個 batch、全有全無、id 由前端產生、不回傳資料列）見 [docs/api.md](docs/api.md)
- 待處理的項目（Google 登入、Hooks）見「未完成」

### 資料一致性
- 推送前比對整個試算表檔案的 `modifiedTime`（由後端在同一把鎖裡比對），衝突時問使用者「放棄並重抓」或「強制推送」。約定見 [docs/api.md](docs/api.md) 的「資料一致性」，前端的處置見 [vue-build/docs/store.md](vue-build/docs/store.md)
- 衝突時不把佇列重新套用到新資料上（見「決定不做」）

### 列表效能
上千列的列表頁做過一輪渲染成本的處理（每列的連結元件、`ref` 的父列查詢、畫面外的列要不要排版）。量測方法、數字與判讀方式見 [vue-build/docs/perf.md](vue-build/docs/perf.md)（附錄）。

### 文件與範本
- 根目錄 `README.md` 是索引；跨兩端的介面在 `docs/api.md`，前端的設計在 `vue-build/docs/`（`architecture` / `schema` / `store` / `ui` + `components/` 每個元件一份）
- `vue-build/template/`：新增一張表所需的全套檔案，**留成真的檔案**（複製整份比從程式區塊裡挑好用，而且 `main` 分支上它是唯一的頁面範例）。裡面只留最小骨架＋每個檔開頭一段「該看哪份文件」；選項目錄與說明一律回 docs，不留第二份會漂移的副本

---

## 未完成

### 後端

- 🔲 **Google 登入**（前端 `authMethod: 'google'`）：走同一套約定，Google 的 ID token 放進登入的 `credentials`，見 [docs/auth.md](docs/auth.md)
- 🔲 Hooks 機制（見 [docs/api.md](docs/api.md)）
- `bulkCreate`：等真的有匯入需求再說

### UI 功能
- 關聯選擇器的 `allowCreate`：清單最上面一項「＋ 新增…」，開父表的新增表單、回來自動選上。看起來是 `runStep('/父表/new')`，但表單頁當「呼叫端」跟動作當呼叫端不一樣，四件事要先解：
  - 回來時 `useCreateForm` 的 `onActivated` 會把表單重置，使用者填到一半的東西會丟掉——要能分辨「從子步驟回來」和「重新進入」
  - 離開表單頁去開父表的新增會被 `useLeaveGuard` 攔下來問要不要放棄
  - 這張表單可能本身就是某條流程的一步（例如「新增父表接著新增子表」的第二步），`runFlow` 不能套疊，而且 `runStep` 在流程中會用 `replace`，把目前這張表單頁換掉
  - 完成後要回到原本那張表單（`back`），不是像流程一樣往前走
  - 等真的常用到再做；現在的替代路徑是先去父表新增、再回來選
- **schema 要不要拆成 `fields.ts` / `view.ts`**（評估過，先不做）：能乾淨切的只有表這一層——`fields.ts` 放 Row 介面、`tableLabel`／`idColumn`／`newId`／`labelColumn`／`columns`／`virtualColumns`，`view.ts` 放 `detailOrder`／`formOrder`／`defaultSort`，`index.ts` 組起來。切在欄位內部（型別／必填 vs 標籤／可搜尋）已否決，那會逼每個 key 寫兩次。現在 view 那半只有三個欄位，拆完是一個五行的檔加一個 import，不划算。回頭重看的時機：view 那半長到 15～20 行，或哪張表需要兩種視圖（跟下一條一起做）
- **視圖設定讓頁面覆寫**（等真的有第二種視圖需求再做）：`detailOrder`／`formOrder`／`defaultSort` 現在只有 schema 一份，同一張表在不同頁面沒辦法有不同的排法與欄位集（AppSheet 是把這些掛在 view 上，所以一張表能有多個 view）。做法是 schema 那份當**預設**、頁面用選用 prop 覆寫（`DataDetail`／`DataForm` 各加一個 `order`、排序走 `useSortedTableList` 的參數），不是搬到頁面去——沒指定的頁面要有東西可用，預設值一定要留在 schema。頁面端自己寫仍然有型別檢查（`RowKey<XxxRow>[]` 是 exported 的），元件內部那層本來就是 `TableSchema<any>`。（篩選抽屜與排序面板的順序已經不必跟著誰了——它們有自己的 `searchable`／`sortable` 清單）

### 頁面類型（對照 AppSheet）

| AppSheet | 現況 |
| --- | --- |
| deck | ✅ 卡片式列表（`DataList`）；🔲 每列的 action 按鍵，見下方 |
| table | ✅ `DataTable` |
| detail | ✅ 詳細頁；🔲 標頭區塊，見下方 |
| form | ✅ 新增／編輯頁 |
| card | 🔲 見下方 |
| gallery | 🔲 圖片 + 標題的格狀排列 |
| chart | 🔲 使用者選幾個欄位當軸，畫圓餅圖、折線圖、長條圖。 |
| dashboard | 🔲 見下方 |
| calendar | 把資料當成事件放上日曆（通常靠日期與時間欄位），暫不考慮 |
| map | 把座標標在 Google 地圖上，暫不考慮 |
| onboarding | 導覽頁，暫不考慮 |

**deck 的 action 按鍵**：在右下角欄位的下一列，以圖示由右往左排列。沒有 action 時整列不佔高度；多選模式下藏起來。

**card** 跟 deck 不同的地方是一張張分開的卡片（有間隔），不是連在一起的清單。點卡片進 detail，不支援長按多選。分大小兩種：
- **小**：左側圓形頭像，中間主標題與副標題，右側 ⋮ 選單收 action
- **大**：上下四層，沒有內容的那層整層藏起來
  1. 圓形頭像 + 主標題與副標題（沒有選單）
  2. 圖片
  3. 標題、副標題、摘要（欄位跟第 1 層分別指定）
  4. 最多四個 action：左兩格、右兩格，每一格各自選用圖示或文字

**detail 的標頭區塊**（可開可不開，裡面每一項都是可選的）：放在 `#top` 之上、整頁最上方，讓人一眼看到這筆的重要資訊。結構是大 card 去掉第 1 層：第 3 層的標題、副標題、摘要疊在第 2 層的圖片上，第 4 層的 action 接在圖片下方、不疊在圖上。沒有圖片時用一般的背景。

dashboard 分三種形式：
1. **分頁**：一次只顯示一個面板，用頁籤切換，只用在手機版
2. **全部顯示**：所有面板同時出現。手機版由上往下排列；電腦版可以自由決定每個面板的長寬與二維的排版位置
3. **連動**：排版同第 2 種，但面板之間會連動，例如在 list 點一個項目，下面的 detail 就顯示那一項

### 列表效能（剩下的部分）
- 🔲 見 [vue-build/docs/perf.md](vue-build/docs/perf.md) 的「還沒做的」

### PWA 與離線
- manifest.json、Service Worker 都還沒建立（`vite-plugin-pwa` 未安裝）
- App 圖示還沒決定（名稱在 `src/config/app.ts`）

### 桌面版
- 桌面版導覽 UI 待定：要不要改成側邊欄常駐、底部導覽列要不要在桌面隱藏，等要做桌面體驗時再決定

### 部署
- 前端靜態託管（Vercel / Cloudflare Pages，注意 SPA fallback）
- 存取權限：前端直接 `fetch` 時只有「任何人」連得上（「只有我自己」需要前端另外取得 Google 的 OAuth access token，尚未試過）；要限制誰能用，靠選用的程式內認證（見 [docs/auth.md](docs/auth.md)），不用時網址是唯一的保護（僅存放於不進版控的 `.env`）
- API 配額用量監控
---

## 決定不做

評估過、決定不走的路。留著是為了不用重複討論；每條都附「什麼情況該回頭重看」。只是延後（有觸發條件、時候到了就做）的仍然留在未完成。

- **路由驅動的通用頁**（`src/pages/[table]/` 四個通用頁讀 `schemas[route.params.table]`，加一張表只要寫 schema + 註冊一行）。當初的動機是「四個頁面檔幾乎一模一樣」，而薄頁面已經把那些樣板抽進版型元件了，頁面檔剩下的每一行都在講「這是哪張表、有哪些動作」。再往前一步只換到「連四個小檔都不用複製」（那本來就是 `template/` 的職責），代價卻是：頁面層失去 Row 型別（版型元件的泛型 slot 就白做了）、eject 的粒度變成整個表的資料夾（靜態路由段會蓋掉動態段）、schema 開始長 UI 設定（`listFields`／`detailTables`）。**回頭重看**：表多到十幾張、而且大多長得一樣
- **佇列持久化**。佇列只在記憶體，重整／當機／分頁被系統殺掉就會丟掉未推送的變更（`beforeunload` 只擋得住主動關分頁）。單人使用、推送就是一顆鈕，不值得。要做的話：存 `localStorage`（`values` 進佇列時就已序列化，直接 `JSON.stringify`）、流程期間暫停寫入（磁碟上停在流程開始前的樣子，被殺掉再開等於自動回滾）；唯一貴的是開機後要把佇列重新疊回從後端抓來的 `rows`，需要一個部分欄位版的 `coerceRow`。**回頭重看**：真的丟過一次未推送的變更
- **離線寫入佇列**（離線時照常操作、連上線再送）。跟上一條是同一個成本結構，而且多了「離線期間看到的資料可能已經過期」的問題。**回頭重看**：真的常在沒網路的地方用
- **推送失敗的逐筆補償**（記錄哪幾筆成功了、只重送失敗的）。推送是全有全無的，根本不會有「成功了幾筆」；而且 id 由前端發、`create` 定義成冪等，整批重送本來就是安全的
- **把佇列重新套用到新資料上**（衝突時保留未推送的改動、疊到重抓回來的資料）。跟佇列持久化是同一種成本；衝突時的兩條出路（放棄重抓／強制推送）夠用
- **連續動作的三件**：
  - **返回＝回到上一步**（而不是整條取消）。代價是三件事加起來等於一個多頁精靈：每步改 `push` 且結束後要清歷史；存檔點要從一格變一疊（每步單獨收回）；上一步的表單要帶著使用者上次填的值重開。**回頭重看**：真有三步以上、常態要回頭改的流程
  - **編輯表單的預設值通道**：`useEditForm` 不讀 `navigationDefaults()`，所以編輯表單可以當流程的一步，但沒辦法把上一步的結果預先填進去。目前想不到需要的情境
  - **進度指示**（第 1 步／共 2 步）：步驟頂多兩三步，每一步是完整的一頁、App Bar 上有自己的標題

---

## 已知的權宜作法

這些不是待辦，是「現在這樣做，但知道為什麼不理想」的紀錄。

- **`refTable` 沒有型別檢查**：只存代稱字串，不保證真的存在於 `schemas`。為了避免 `schema/types.ts` 反向 import `schema/index.ts` 造成循環依賴，先接受
- **`template/` 不在 `src/` 底下**，所以不會被 lint 與型別檢查掃到，元件 props 改了範本不會自動報錯。目前靠「把範本複製成一張暫時的表、建置過再刪掉」手動驗證
- **刪除時會閃一下「找不到這筆資料」**：快取更新後、返回動畫還在跑的期間，detail 頁的 row 已經是 null。因為那筆資料確實已經不存在，語意上可接受，所以沒有為它增加凍結顯示的機制
