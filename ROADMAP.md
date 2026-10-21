# 框架進度

這份只追蹤**通用框架**的狀態。這個專案自己的表與頁面見 [PROJECT-ROADMAP.md](PROJECT-ROADMAP.md)（只存在於 production 分支）。

設計說明見 [README.md](README.md)。

---

## 已完成

### 前端骨架
- Vue 3 + TypeScript + Vuetify，unplugin-vue-router 檔案式路由，Pinia
- `AppShell`：頂部 App Bar（標題來自 `route.meta.title`）+ 底部導覽列 + 側邊欄（目前只有登出）。`meta.shell: false` 的頁面三者都不顯示
- App Bar 左側圖示依路由自動切換漢堡選單／返回箭頭
- 頁面前進/後退轉場動畫，方向依「網址相同時依瀏覽器歷史前後 → 導覽列順序 → 回到頂層 → 同路由換 id 依列表順序 → 瀏覽器歷史前後」五層判定。以 View Transitions 截下換頁前後的畫面再左右滑動，App Bar 等外殼另外命名而不隨頁面滑動；網址不變的 dashboard 展開與縮回亦共用此動畫
- 底部導覽列切換分頁用 `replace`，內頁不會堆進歷史
- `<KeepAlive :max="50">` 以 `route.fullPath` 為 key，保留列表的展開狀態與頁面裡的其他元件狀態；同一個實例只對應一個網址，路由參數對它而言是常數
- 捲動位置還原：視窗的捲動位置不是元件狀態，KeepAlive 管不到，所以 router 自己記一份 `fullPath → scrollY`（`beforeEach` 存、`scrollBehavior` 還原，上限同 KeepAlive 的 50 筆）。返回鍵優先用瀏覽器自己記的 `savedPosition`；沒看過的頁面一律從頂端開始（以前是停在上一頁的位置）

### Schema 型別系統
- `SchemaColumn` / `TableSchema` 型別，`type` 支援 `text`／`number`／`date`／`duration`／`boolean`／`ref`／`select`／`image`
- `coerceRow`（後端字串 → 前端型別）與 `serializeRow`（反向）
- `formatColumnValue` 顯示格式化；另以 `'sheet'` 取得寫回 Sheet 的文字（`boolean` 寫 `TRUE`／`FALSE`、`ref` 寫 id），`serializeRow` 即用它
- `columnValues`（組送出用 payload）、`emptyRow`（新增表單起始值，套用欄位的 `default`）
- `sortRows(rows, schema, sort?)`（使用者選的排序在前、`defaultSort` 接在後面當 tiebreaker）、`sortableColumns`、`sortByKey`（`schema/sort.ts`）；`groupRows`（多層分組）、`flattenGroups`（把分組攤回畫面順序）在 `schema/group.ts`
- **`schema/` 放對 row 做事的純函數**（`types`／`sort`／`group`／`filter`／`validation`／`relations`／`image`），不碰 reactivity，所以 store、元件、composable 都能直接叫；`composables/data/` 只放反應式包裝（`useTable`／`useSearch`／`useFilter`）。各表的欄位定義在 `schema/tables/`（一張表一個檔），註冊表 `schema/index.ts` 留在根目錄當公開入口
- `detailOrder` / `formOrder` 分別控制詳細頁與表單頁的欄位順序，為這張表的預設；個別頁面以 `DetailPage`／`FormPage`（與 `DataDetail`／`DataForm`）的 `order` prop 覆寫；欄位的 `showIf` 依這一列的資料決定詳細頁是否顯示該欄
- `virtualColumns`：不在 Sheet 上、讀的時候才算的欄位，來源可以是自己這列、父列（`row.$欄位key`）或子列（`row.$子表_欄位key`）。store 掛成 row 上的 getter，顯示、排序、分組都跟真實欄位一樣；兩種欄位共用 `ColumnTypes`／`ColumnBase` 型別骨架。排進 `formOrder` 時於表單中唯讀顯示、隨輸入即時重算（表單的 row 經 `store.withGetters` 掛上同一套 getter）
- `labelColumn`：一列怎麼稱呼（欄位 key，省略就是 id），store 掛成 `row.$label`
- `idColumn`：主鍵是 `columns` 中的哪一欄（值為字串的欄位），其值即為 `row.id`。可以是 `ref`（與父表共用 id 的一對一延伸表）或由使用者輸入；新增時留空才以選用的 `newId()` 發號。建立後不能修改：編輯表單與有給 `rows` 的 `askFields` 中唯讀，store 的 `update` 擋下其他途徑；`create` 擋下重複的 id 與剛被刪除、尚未推送的 id。不以數字或 `=`、`+`、`-`、`'` 開頭，只能使用 `encodeURIComponent` 不會改變的字元，不能是 `.` 或 `..`
- `TableSchema<Row>`：各表宣告時帶自己的 Row 介面，欄位 key 與 `type` 對著它檢查，虛擬欄位 `value` 的 `row` 有型別；框架端用不帶參數的 `TableSchema`
- `duration` 欄位：一段長度（不是時間點），值是 `"時:分:秒"` 字串、時數不設上限（`30:15:45` 合法），Sheet 上就是 `2:30:00`；讀進來容忍 `H:mm`（秒補 00）與 `H:mm:ss`。表單是一般文字框（原生 `type="time"` 塞不下超過 24 小時），排序與篩選都換算成秒再比（篩選是最短／最長的範圍）。🔲 「幾點幾分」的時間點型別還沒有，需要再加
- `boolean` 欄位：值為 `true`／`false`／`null`，Sheet 上為 `TRUE`／`FALSE`／空白。顯示為是／否；表單是兩顆互斥的按鈕，再按一次已選的即清空；篩選勾選是、否、(空白)，排序否在前；不進搜尋列
- `date` 讀進來時歸零到當天午夜：Sheet 上手動加了時間也不會讓看起來一樣的兩列排序或篩選不一樣
- `image` 欄位：一格一張，值是行內 SVG、圖片網址、或 Google Drive 的檔案 id／分享連結，由 `schema/image.ts` 的 `imageSrc()` 依內容判斷後轉成 `<img src>`（Drive 走 thumbnail 端點、沿用瀏覽器的 Google 登入；SVG 轉 `data:` URI，當成圖片載入就不能執行 script）。詳細頁自動顯示，列表的圖片於 view 的 `image` 指定，表單是純文字欄位；不進搜尋與篩選。上傳到 Drive 還沒做
- `select` 的 `allowCustom`：`options` 只當建議清單，表單變 `v-combobox`、打別的字也收、驗證跳過選項檢查；資料形狀還是一個字串，顯示與篩選不用知道差別。建議清單另可由欄位的 `suggestedValues: (row, rows) => 值的清單` 算出，接在 `options` 後面（`row` 掛了 getter，可讀父列與同一父列底下的其他子列；`rows` 是這張表的所有列）

### 跨表關聯
- `schema/relations.ts` 掃 schema 的 `ref` 欄位自動產生關聯圖，新增關聯只要標 `type: 'ref'`
- store 在每列掛每個 ref 欄位的 `$欄位key`（父列），虛擬的 ref 亦同（只有正向，不進關聯圖），`formatColumnValue` 遇到 ref 就顯示對方的 `$label`，所以 detail／表格／列表／選擇器全都顯示名字、沒有 ref 專用元件
- `DataForm` 的 `ref` 欄位是父表整表的可搜尋下拉清單（`v-autocomplete`），每列文字與搜尋比對都是對方的 `$label`；「前往對方」是欄位動作 `goToRefAction`，頁面自己列
- store 也在每張父表的列掛 `$子表_欄位key`（指向這列的子列陣列，照子表 `defaultSort` 排），零設定；虛擬欄位與頁面直接讀它，不用另外查。名字帶 ref 欄位，所以同一張子表兩個 ref 指向同一張父表（平行邊）各自一個 getter，不會撞
- `ensureLoaded(table)` 會把父表與子表一起載（擋循環）
- 連帶刪除：ref 欄位標 `onDelete: 'cascade'`，父列被刪時 `store.removeMany` 順著關聯圖把子列也刪掉（多層遞迴，走同一條 `patch`＋`enqueue`）；`ensureLoaded` 會把 cascade 的子表一起載
- 沒有子列時刪除父列：ref 欄位標 `onEmpty: 'delete'`，子列被刪除或改指別的父列而使原本的父列沒有子列時，`store` 的 `update`／`removeMany` 寫入後把它刪掉（走 `removeMany`，多層往上遞迴）；只在子列減少時檢查，剛建立的空父列不受影響

### 資料存取
- `stores/tables/`：每張表一份全 App 共用的快取，同一張表不會重複打 API
- `useTableList` / `useSortedTableList` / `useTableRow`（同一個 `data/useTable.ts`）都讀同一份
- 寫入走 store 的 `create` / `update` / `remove` / `removeMany`：改快取並進佇列，呼叫端不用手動 refresh
- 待寫入佇列 `pending`（含合併規則）與手動推送；四個寫入 action 是同步的，只動快取與佇列
- `notify()`：全 App 一則 snackbar 訊息，由 `AppShell` 渲染（跟 `confirm()` 一起放在 `shell/useDialogs.ts`）
- 新增的 id 由前端決定：主鍵那一欄的值，空的才以 `newId()` 發號，格式由各表決定（`prefixedId('TPL')` 是現成的前綴式）。後端收到已存在的 id 就當作重送、回傳既有那筆
- 跨表算出來的值靠共用快取的 reactivity 自動重算，不需要跨表失效機制

### 累積寫入
改動先累積在前端，由使用者按「推送」才一次寫進 Sheet。設計與實作見 [vue-build/docs/topics/store.md](vue-build/docs/topics/store.md)。
- 佇列 `pending`、合併規則、`flush`、`hasPending` / `flushing` / `flushError`
- 四個寫入 action 變成同步的，只動快取與佇列
- 流程存檔點 `beginFlow` / `commitFlow` / `rollbackFlow`（給連續動作用；流程進行中 `flush` 會被擋下）
- App Bar 最右側的同步鈕（`refresh()` ＝ 推送 + 重抓所有已載入與載入失敗的表）+ 未推送圓點標記（失敗轉紅）+ `beforeunload` 攔截
- 表單開著的時候同步鈕停用（`useSyncHold` 持有 `holdSync()`，`canSync` 判斷）
- flush 失敗保持「未推送」狀態並用 snackbar 報錯，讓使用者重按；整批重送，不做逐筆補償
- **重抓前一定先 flush**，沒清乾淨就不重抓；沒有「只重抓一張表」的 API
- 跨表寫入順序無所謂。Sheet 沒有外鍵約束，後端也不做合法性驗證，所以父表子表誰先寫都不會壞
- `flush` 把整個佇列（跨所有表）攤平成一串 operations，**一個請求送完、全有全無**：成功才清空佇列，失敗原封不動讓使用者重按（見 [docs/api.md](docs/api.md)）
- 佇列只在記憶體、不寫進 `localStorage`

### 共用元件庫
- 列表：`DataList`（卡片式單列，含長按多選）、`DataProfile`（profile 的單張卡片，動作收於 ⋮ 選單，含長按多選）、`DataCard`（card 的單張卡片，四層版面，含長按多選）、`DataGallery`（gallery 的單一格，含長按多選）、`ListLayout`（各筆的排法：依序往下或格狀）、`ListField`、`CountLabel`（名稱 + 筆數的小標籤，分組標題與子表區塊共用）、`GroupedList`（多層可收合分組，標題帶筆數）、`DataTable`（表格式，也用於 detail 頁內嵌子表格；`columns` 可指虛擬欄位）
- 詳細：`DataDetail`（欄位區，虛擬欄位自動顯示；`editable` 的欄位為快速編輯）、`DetailField`、`DetailHeader`（選用的標頭區塊）、`InlineField`（快速編輯的一欄：打字類在失焦或 Enter 時、其餘一改就以 `store.update` 寫入，驗證不過不寫入）
- 表單：`DataForm`；單一欄位的輸入元件為 `FieldInput`（依 `column.type` 自動選擇），表單與快速編輯共用
- 整頁版型：`PageState`（載入中／載入失敗／找不到資料，全 App 唯一一份，資料到手才畫 slot）、`FormPage`（新增／編輯頁，內部包 `PageState`，另外處理送出失敗）、`DetailPage`（詳細頁：欄位區 + 左右滑動換筆 + 上下筆箭頭 + FAB）、`ListPage`（列表頁：逐列渲染卡片、`#rows` slot 整批給表格、或 `groups` 交給 `GroupedList`，加上 FAB 與發布列表順序，分組時先 `flattenGroups`）、`ChildList`（詳細頁裡的子表區塊：標題帶筆數、顯示上限、空狀態，右下角一列「展開」與頁面給的動作）。這些都是泛型元件，slot 的 `row` 帶著呼叫端的 Row 型別
- 詳細頁的順序分工：欄位照 schema 的 `detailOrder`（頁面可以 `order` 覆寫），區塊（`ChildList` 之類）照頁面的 slot——`#top` 在欄位上面、default 在下面。插在特定欄位中間刻意不支援，那種版面直接不用 `DetailPage`（它的 template 只有二十行，零件都是現成的）
- 子表區塊的「展開」是**一個真的頁面**（`/父表/:id/子表`，範本 `template/pages/child-list.vue`，一條關聯一份、約 20 行），不是就地展開版面。這樣返回鍵、轉場、App Bar 標題都是現成的，而且 `ListPage` 會發布這份順序——從父列底下點進某一筆，上／下一筆走的是同一個父列的子列
- 狀態只在兩個地方出現：產生它的 composable，和畫它的 `page/` 那層版型。`DataList`／`DataForm`／`DataDetail` 這些內容元件都不碰 loading／error
- 其他：`ViewActions`（view 的列上動作：一排按鈕、⋮ 選單或左右各兩格）、`PageFab`、`TabPage`、`RecordNav`、`AppDialog`、`ConfirmDialog`、`FieldsDialog`（只顯示幾欄的 `DataForm`）
- `TabPage` 的頁籤列登記給 `AppShell` 畫在 App Bar 的 extension，所以固定在最上面；每個頁籤外面包一層 `TabPanel`，`provide` 一份「我是不是當前頁籤」（`panelActiveKey`）。看過的面板會一直掛著（`v-window` 用 `v-show` 切），而 `PageFab`、`registerSlot`（App Bar／底部動作）、`useListOrder` 的「活著」判斷都是 `KeepAlive 狀態 && 當前面板`，所以一個頁籤放一整張表的列表、各自掛自己的 FAB 與動作是可以的。不在 `TabPage` 裡就一律算當前，現有頁面零改動。動作那兩個 watch 刻意分成 `pre`（讓場的清）與 `post`（進場的設），同一輪切換時順序才不會反過來變成空的

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
- 比較方式兩個型別是特例：`ref` 照對方的 `$label`（值是 id，照 id 排沒意義）、`select` 照 `options` 的宣告順序（狀態有先後，字典序不對），`options` 沒有的值排在其後、彼此照文字比較；文字比較時其中的數字照大小排（`2` 在 `10` 之前）
- **排序與分組二選一**，框架不介入：分組會把原本的順序壓成組內順序，所以頁面自己在 `sort` 不是 null 時把 `groups` 換成 `rows`（有分組的列表頁就是這樣）。排序一改，`ListPage` 發布的列表順序跟著改，詳細頁的上下一筆自動一致

### 動作系統
說明見 [vue-build/docs/topics/actions.md](vue-build/docs/topics/actions.md)。
- `PageAction` 型別（`{ key, label, icon, onClick, confirm?, display? }`），FAB、App Bar、底部動作列、detail 欄位動作共用同一種描述；內建 builder 的 label／icon 可用最後一個參數 `ActionLook` 覆寫，與行為的 options 分開
- 通用 builder：`newAction` / `editAction` / `deleteAction` / `bulkDeleteAction` / `quickEditAction`，皆為一般函式，回傳一個 `PageAction`，不適用時回傳 `null`；不以列為參數者由 `use表名Actions` 以 `useAction` 包裝為 `ComputedRef<PageAction | null>`；以列為參數者（編輯、刪除）為函式，列表的 view 與欄位動作直接以該列呼叫，detail 頁以 `useRowAction` 綁定至當前那一筆。刪除目前 detail 頁所顯示的那一筆時自動離開
- 欄位動作（`DataDetail` 的 `fieldActions`，欄位 key → `(row) => PageAction | null`，一欄一個、整格可點）：`goToRefAction`（ref 前往對方）／`openUrlAction`（開新分頁）／`setFieldAction`（立即改成某個值，可帶 confirm）
- 需要確認的動作宣告 `confirm` 就好，`useActionRunner` 先 `await confirm()` 再跑，錯誤進 snackbar；頁面不用擺 `ConfirmDialog`
- `confirm()` / `choose()` / `askFields()`：是／否、幾條出路（回傳按下去那顆的 key，取消是 `null`）、問幾個欄位；都是 module-level 狀態 + `AppShell` 掛一個實例 + promise，前兩個共用同一個 `ConfirmDialog`；`quickEditAction` 用後者把選取的多筆改成同一個值（欄位由設計者定，只選一筆時顯示現值）
- 每張表的動作（含批次刪除）一律從 `use表名Actions(options)` 取，每一項是一個動作，用不到的是 `null`；一個位置放哪幾個由頁面組成陣列，各位置接收 `(PageAction | null)[]` 並略過 `null`
- `useAppBarActions()` 用 provide/inject 把動作註冊到 App Bar，數量多自動收成下拉選單
- `useBottomActions()` 把動作註冊到螢幕最底端，暫時取代導覽列（表單頁的取消／送出）；兩者共用 `useActionSlot` 的 KeepAlive 防護
- `PageFab` 依數量自動在固定顯示與 speed-dial 之間切換

### 表單與多選
- `useCreateForm` / `useEditForm` 收掉新增與編輯的重複邏輯（起始值、載入、送出、導覽、錯誤狀態），取消／送出也由它們自己掛上底部動作列，頁面只剩「這是哪張表」
- 新增表單的預設值三層：schema 的 `default` → `newAction` 經 `history.state` 帶來的 → `useCreateForm` 的參數
- 前端驗證：`schema/validation.ts` 的 `validateRow`（內建 `required`／`min`／`max`／`select` 選項，其他規則由欄位的 `validate(value, row)` 自訂）一份，form 層與 `askFields` 送出前逐欄提示、store 的 `create`／`update` 寫入前再擋一次（拋錯、不動快取）；後端只做結構完整性，分工見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md)
- `useMultiSelect` + `useLongPress`：長按進入多選，選取狀態由「有沒有選取任何一筆」推導；`itemProps(id)` 是每列要綁的那一包（`selectable`／`selectMode`／`selected`／長按與點選），列表元件與分組列表共用同一份
- 分組或分頁籤的列表也走 `ListPage`：一個頁籤一個 `ListPage`，各自算狀態、FAB 與列表順序，靠面板訊號決定哪份生效，頁面不用知道當前是哪個頁籤
- 列表頁的資料層 `useListPage(table, schema)`：整表 → 排序 → 篩選 → 搜尋（順手登記 App Bar 的放大鏡與排序鈕）＋ 多選，一次回傳（含 `sort`，頁面用它決定還要不要分組）；一頁接好幾張表時傳 `search: false`，改由頁面自己登記，再傳 `query` 讓每張表共用同一條搜尋字串
- 多選的出口：`useMultiSelect` 把「怎麼退出」登記到 `appBarSelectionKey`（只給一個函式，按鈕長怎樣歸 `AppShell`，跟放大鏡同一種分工），頁面零設定。那顆鈕釘在同步鈕左邊、**不收進「⋮」**（收進去就沒有明顯出口），而且「有沒有登記」就是「現在是不是多選模式」——多選時搜尋鈕先讓位，把空間留給對選取項目的動作
- 離開就取消選取：`onDeactivated`（KeepAlive 的列表換頁時）與 `useCurrentTab()`（換頁籤時）自動清，頁面零設定。頁籤訊號取自 `TabPage` 登記給 `AppShell` 的那份，頁面層與面板層讀到同一個，所以兩種頁籤形狀不用各寫一套
- 批次刪除走動作的 `confirm`

### 連續動作
設計與實作見 [vue-build/docs/topics/actions.md](vue-build/docs/topics/actions.md)，離開前的確認見 [vue-build/docs/topics/pages.md](vue-build/docs/topics/pages.md)。
- 流程存檔點 `beginFlow` / `commitFlow` / `rollbackFlow`：把一段流程的快取與佇列改動一次還原；套疊直接拋錯，流程進行中 `flush` 會被擋下
- `useFlow.ts`：`runFlow`（外殼：存檔點 + commit / rollback）、`runStep`（開表單等送出）、`resumeStep`（表單交棒）、`FlowCancelled`、`hasEarlierSteps`
- `router.afterEach` 中止等待中的步驟（reject）並回滾；`useCreateForm`／`useEditForm` 送出成功後先問 `resumeStep`
- 第一步 `push`、之後 `replace`
- 離開前先問：`useLeaveGuard` 的 `router.beforeEach`，返回鍵／導覽列／改網址／底部取消全走同一條；第二步之後一律問，否則看表單有沒有改動
- 範本 `table/use__Table__Actions.ts` 的回傳物件末尾有寫法示範（註解），說明見 [vue-build/docs/topics/actions.md](vue-build/docs/topics/actions.md) 的「連續動作（流程）」；專案端的第一條流程見 production 分支的 PROJECT-ROADMAP
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

- 已實作並於 **2026-10-02 對實際的 Sheet 完成測試**：入口與信封、整表讀取、batch（鎖、衝突比對、全有全無）、表頭對應、結構完整性檢查。實作規則、值寫入儲存格的行為與實測結果見 [apps-script/README.md](apps-script/README.md)；字串轉義由前端處理，見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md)
- 認證：`Config.gs` 的 `AUTH` 啟用時，登入換 token（加鹽的 SHA-256 比對帳密、HMAC 簽章、30 天效期、剩不到一半自動續期），每個請求先驗 token 才開試算表。設計見 [docs/auth.md](docs/auth.md)
- 前後端介面（GET 整張表、POST 一個 batch、全有全無、id 由前端產生、不回傳資料列）見 [docs/api.md](docs/api.md)
- 待處理的項目（Google 登入、Hooks）見「未完成」

### 資料一致性
- 推送前比對整個試算表檔案的 `modifiedTime`（由後端在同一把鎖裡比對），衝突時問使用者「放棄並重抓」或「強制推送」。約定見 [docs/api.md](docs/api.md) 的「資料一致性」，前端的處置見 [vue-build/docs/topics/store.md](vue-build/docs/topics/store.md)
- 衝突時不把佇列重新套用到新資料上

### 列表效能
上千列的列表頁做過一輪渲染成本的處理（每列的連結元件、`ref` 的父列查詢、畫面外的列要不要排版）。量測方法、數字與判讀方式見 [vue-build/docs/perf.md](vue-build/docs/perf.md)（附錄）。

### 文件與範本
- 根目錄 `README.md` 是索引；跨兩端的介面在 `docs/api.md`，前端的文件在 `vue-build/docs/`（`architecture`、`perf`，`topics/` 各項機制、`design/` 設計指南、`components/` 每個元件一份）
- `vue-build/template/`：新增一張表所需的全套檔案，**留成真的檔案**（複製整份比從程式區塊裡挑好用，而且 `main` 分支上它是唯一的頁面範例）。裡面只留最小骨架＋每個檔開頭一段「該看哪份文件」；選項目錄與說明一律回 docs，不留第二份會漂移的副本

---

## 未完成

### 後端

- 🔲 **Google 登入**（前端 `authMethod: 'google'`）：走同一套約定，Google 的 ID token 放進登入的 `credentials`，見 [docs/auth.md](docs/auth.md)
- 🔲 Hooks 機制（見 [docs/api.md](docs/api.md)）
- `bulkCreate`：等真的有匯入需求再說

### Schema
- **可修改的 id**（延後，等確實需要修改 id 的情境再做）：主鍵一改，所有記著舊 id 的地方都須跟著換
  - 子列的 ref：沿著關聯圖連帶更新為新 id（類似連帶刪除）；子表的 id 欄本身為 ref 時須遞迴
  - 待推送佇列：未推送的新增直接換 id；已在 Sheet 上的列，推送前後端仍為舊 id，佇列須記一份「新 id → 舊 id」的對照，否則同一批中後續的操作找不到列
  - 畫面：詳細頁的網址、KeepAlive 的快取、列表發布的順序、多選的 id、儀表板的選取皆記著舊 id，編輯後須以新 id 取代
  - 編輯時清空 id 欄即重新發號，亦屬於修改 id

### UI 功能
- 關聯選擇器的 `allowCreate`：清單最上面一項「＋ 新增…」，開父表的新增表單、回來自動選上。看起來是 `runStep('/父表/new')`，但表單頁當「呼叫端」跟動作當呼叫端不一樣，四件事要先解：
  - 回來時 `useCreateForm` 的 `onActivated` 會把表單重置，使用者填到一半的東西會丟掉——要能分辨「從子步驟回來」和「重新進入」
  - 離開表單頁去開父表的新增會被 `useLeaveGuard` 攔下來問要不要放棄
  - 這張表單可能本身就是某條流程的一步（例如「新增父表接著新增子表」的第二步），`runFlow` 不能套疊，而且 `runStep` 在流程中會用 `replace`，把目前這張表單頁換掉
  - 完成後要回到原本那張表單（`back`），不是像流程一樣往前走
  - 等真的常用到再做；現在的替代路徑是先去父表新增、再回來選
- **schema 要不要拆成 `fields.ts` / `order.ts`**（評估過，先不做）：能乾淨切的只有表這一層——`fields.ts` 放 Row 介面、`tableLabel`／`idColumn`／`newId`／`labelColumn`／`columns`／`virtualColumns`，`order.ts` 放 `detailOrder`／`formOrder`／`defaultSort`，`index.ts` 組起來。切在欄位內部（型別／必填 vs 標籤／可搜尋）已否決，那會逼每個 key 寫兩次。現在順序那半只有三個欄位，拆完是一個五行的檔加一個 import，不划算。回頭重看的時機：順序那半長到 15～20 行
- **條件式樣式**（對照 AppSheet 的 format rules）：滿足條件時改變指定欄位的呈現，例如顏色、粗細、底線，或在值旁加上圖示。尚未設計，要先決定：
  - 作用在哪些地方：詳細頁的欄位、列表 view 的各位置、表格的儲存格
  - 規則寫在哪：欄位上（同 `showIf`，以 row 判斷），或頁面／view 上
  - 一個欄位符合多條規則時如何疊加；顏色須在深色模式下也看得清楚
- **列表的預設排序讓頁面覆寫**（等真的需要再做）：欄位的順序已可由頁面的 `order` 覆寫，`defaultSort` 仍只有 schema 一份，同一張表在不同列表頁無法有不同的預設排序。做法同 `order`：schema 那份當預設，頁面經由 `useSortedTableList` 的參數覆寫

### 頁面類型（對照 AppSheet）

| AppSheet | 本框架的名稱 | 現況 |
| --- | --- | --- |
| deck | **deck** | ✅ 卡片式列表（`DataList`），含每列的 action 按鍵（`ViewActions`） |
| table | **table** | ✅ `DataTable` |
| detail | **detail** | ✅ 詳細頁，含選用的標頭區塊（`DetailHeader`），見下方 |
| form | **form** | ✅ 新增／編輯頁 |
| card（小） | **profile** | ✅ `DataProfile`，見下方 |
| card（大） | **card** | ✅ `DataCard`，見下方 |
| gallery | **gallery** | ✅ `DataGallery`，圖片 + 標題的格狀排列，見下方 |
| chart | **chart** | 🔲 使用者選幾個欄位當軸，畫圓餅圖、折線圖、長條圖；另含文字統計（例如依某欄位分組計數，以「標籤＋數字」的格子呈現）。以 SVG 繪製，依面板寬度縮放。屬於後期才做的項目 |
| dashboard（分頁） | **tab** | ✅ `TabPage` |
| dashboard（全部顯示、連動） | **dashboard** | ✅ `DashboardPage`，見下方 |
| calendar | — | 把資料當成事件放上日曆（通常靠日期與時間欄位），暫不考慮 |
| map | — | 把座標標在 Google 地圖上，暫不考慮 |
| onboarding | — | 導覽頁，暫不考慮 |

**視圖（view）**：deck、profile、card、gallery 與 detail 標頭共用同一套「欄位與位置的對應」，實作於 `schema/view.ts`。`defineView(schema, {…})` 與 `defineCardView(schema, {…})` 回傳一個函式，傳入一列即回傳各位置的內容與該列的動作；欄位定義在建立時即查找完畢。view 定義於頁面並交給版面元件，schema 本身不含 view。目前 deck（`DataList`）、profile（`DataProfile`）、card（`DataCard`）、gallery（`DataGallery`）與 detail 標頭（`DetailHeader`）皆已套用，card 以外皆使用 `defineView`：
- 一組位置（`FieldGroup`）：`title`、`subtitle`、`image`、`summary`，以及僅 deck 使用的 `aside`。每個位置皆可省略：省略的位置不顯示、不佔位置；指定了但這一列沒有值的保留位置，各列因此對齊。可填入欄位 key，或每列皆有的 `id`、`$label`（`keyof RowBase`）；需合併多個欄位，或顯示父列、子列的資訊時，應宣告為 `virtualColumns`
- deck 的四角：`title` 左上、`subtitle` 右上、`summary` 左下、`aside` 右下，`image` 為左側縮圖
- card 使用兩組（`defineCardView`）：`header` 為第 1 層（`image` 作為頭像），`body` 為第 2、3 層（`image` 作為大圖，`summary` 為摘要）。detail 標頭相當於僅有 `body` 一組，因此直接使用 `defineView`
- 動作 `actions: (row) => (PageAction | null)[]`，與欄位定義於同一個 view。依位置排列：card 與 detail 標頭的前兩個置於左側、後兩個置於右側，`null` 表示空位；deck 與 profile 會略過空位。`PageAction` 新增 `display: 'icon' | 'text'`

**deck 的 action 按鍵**（✅ `ViewActions`）：置於右下角欄位的下一列，由左往右排列、整組靠右。沒有 action 時不佔高度；多選模式下隱藏。按鈕為原生 `<button>` 加圖示，不使用 `v-btn`（考量列數多時的實例成本，見 [vue-build/docs/components/view/ViewActions.md](vue-build/docs/components/view/ViewActions.md)）。🔲 尚未依 [vue-build/docs/perf.md](vue-build/docs/perf.md) 的方法量測加入動作列前後的差異

**profile 與 card** 跟 deck 不同的地方是一張張分開的卡片（有間隔），不是連在一起的清單。點卡片進 detail，支援長按多選。
- **profile**（✅ `DataProfile`）：左側圓形頭像，中間主標題與副標題，右側 ⋮ 選單收 action。沒指定頭像時不顯示頭像；只有一個 action 時亦收入選單。選單於第一次按下 ⋮ 時才建立（ViewActions 的 `variant="menu"`），每列平時僅有一顆原生按鈕。間隔由卡片自身負責
- **card**（✅ `DataCard`）：上下四層，沒指定任何位置的那層整層藏起來；大圖指定了但沒有圖時以灰色方塊佔位
  1. 圓形頭像 + 主標題與副標題（沒有選單）
  2. 圖片：固定 16:9、裁切填滿，載入前即確定高度
  3. 標題、副標題、摘要（欄位跟第 1 層分別指定；摘要最多三行）
  4. 最多四個 action：左兩格、右兩格，每一格各自選用圖示或文字（ViewActions 的 `variant="slots"`，`null` 保留為空格）
  - 多選時勾選圖示疊於卡片左上角，不受各層有無內容影響
  - `contain-intrinsic-size` 依出現的層加總出替代高度，以 inline style 指定

**gallery**（✅ `DataGallery`）：格狀排列，`ListPage` 的 `layout="grid"`（`ListLayout`，分組時每組各自排列）。欄寬在手機上恰為兩欄，平板與桌面自動增加欄數。
- 每格固定 3:4、直角、帶陰影：上方為正方形圖片，下方為標題與副標各一行，⋮ 選單置於右下角
- 沒有圖片時以同樣大小的灰色方塊佔位，格線才會對齊
- 支援長按多選，勾選圖示疊於圖片左上角

**detail 的標頭區塊**（✅ `DetailHeader`，由 `DetailPage` 的 `header` prop 開啟，裡面每一項都是可選的）：放在 `#top` 之上、整頁最上方，讓人一眼看到這筆的重要資訊。結構是 card 去掉第 1 層：第 3 層的標題、副標題、摘要疊在第 2 層的圖片上，第 4 層的 action 接在圖片下方、不疊在圖上。
- 有圖片時：寬度貼齊畫面兩側，固定 16:9、裁切填滿，高度以 `40vh` 為上限；文字為白色，底下墊一層由透明至深色的漸層
- 沒有圖片時：背景透明，寬度與欄位區相同，高度僅為文字的高度

**tab**：一次只顯示一個面板，用頁籤切換。就是現有的 `TabPage`。

**dashboard**（✅ `DashboardPage`、`DashboardPanel`，外觀與操作見 [vue-build/docs/design/dashboard.md](vue-build/docs/design/dashboard.md)）：所有面板同時出現。手機與電腦皆以方格座標二維排版（手機寬 6 格、電腦寬 24 格），每個面板可指定寬與高的格數，或交由自動排版；面板可就地展開為整頁。用一個 `interactive` 開關決定面板之間要不要連動：
- **關**：各面板各自獨立
- **開**：面板之間會連動，例如在 list 點一個項目，旁邊的 detail 就顯示那一項，而不是換頁
- 🔲 form 於窄面板中是否需要調整版面，尚未確認

### 列表效能（剩下的部分）
- 🔲 見 [vue-build/docs/perf.md](vue-build/docs/perf.md) 的「還沒做的」

### PWA 與離線
- manifest.json、Service Worker 都還沒建立（`vite-plugin-pwa` 未安裝）
- App 圖示還沒決定（名稱在 `src/config/app.ts`）

### 桌面版
- 桌面版導覽 UI 待定：要不要改成側邊欄常駐、底部導覽列要不要在桌面隱藏，等要做桌面體驗時再決定
- 手機與電腦排版的切換門檻待定：`useCompactLayout()` 暫定沿用 Vuetify `mobile` 的 1145px；平板直放應使用 dashboard 的 24 格，門檻可能須調低（例如 840px）

### 部署
- 前端靜態託管（Vercel / Cloudflare Pages，注意 SPA fallback）
- 存取權限：前端直接 `fetch` 時只有「任何人」連得上（「只有我自己」需要前端另外取得 Google 的 OAuth access token，尚未試過）；要限制誰能用，靠選用的程式內認證（見 [docs/auth.md](docs/auth.md)），不用時網址是唯一的保護（僅存放於不進版控的 `.env`）
- API 配額用量監控
