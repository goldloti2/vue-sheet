# 框架進度

此文件只追蹤**通用框架**的狀態。此專案自己的表與頁面見 [PROJECT-ROADMAP.md](PROJECT-ROADMAP.md)，該文件只存在於 production 分支。

設計說明見 [README.md](README.md)。

---

## 已完成

### 前端骨架
- Vue 3 + TypeScript + Vuetify，unplugin-vue-router 檔案式路由，Pinia
- `AppShell`：頂部的 App Bar（標題來自 `route.meta.title`）、底部導覽列與側邊欄。`meta.shell: false` 的頁面三者皆不顯示
- 底部導覽列最多 5 項，其他的頂層頁面置於側邊欄（`NavDrawer`）。側邊欄的頁面可以分組，有標題的組可以展開與收合，最下方為登出
- App Bar 左側的圖示依路由自動切換漢堡選單或返回箭頭
- 頁面前進、後退的轉場動畫：
  - 方向依五層規則判定：網址相同時依瀏覽器歷史的前後 → 導覽列的順序 → 回到頂層 → 同一路由換 id 時依列表順序 → 瀏覽器歷史的前後
  - 以 View Transitions 截下換頁前後的畫面再左右滑動。App Bar 等外殼另外命名，不隨頁面滑動
  - 網址不變的 dashboard 展開與縮回，也共用此動畫
- 底部導覽列切換分頁時使用 `replace`，內頁不堆進歷史
- `<KeepAlive :max="50">` 以 `route.fullPath` 為 key，保留列表的展開狀態與頁面中其他元件的狀態。同一個實例只對應一個網址，路由參數對該實例而言是常數
- 捲動位置的還原：
  - 視窗的捲動位置不屬於元件狀態，KeepAlive 不負責，因此 router 自行記錄一份 `fullPath → scrollY`：於 `beforeEach` 儲存，於 `scrollBehavior` 還原，上限與 KeepAlive 同為 50 筆
  - 返回鍵優先使用瀏覽器自己記錄的 `savedPosition`
  - 沒看過的頁面一律從頂端開始

### Schema 型別系統
- `SchemaColumn`、`TableSchema` 型別，`type` 支援 `text`、`number`、`date`、`duration`、`boolean`、`ref`、`select`、`image`
- `coerceRow`（後端的字串 → 前端的型別）與 `serializeRow`（反向）
- `formatColumnValue` 格式化顯示的文字。另以 `'sheet'` 取得寫回 Sheet 的文字：`boolean` 寫 `TRUE`、`FALSE`，`ref` 寫 id。`serializeRow` 即使用此模式
- `columnValues`（組成送出用的 payload）、`emptyRow`（新增表單的初始值，套用欄位的 `default`）
- `schema/sort.ts`：`sortRows(rows, schema, sort?)`（使用者選的排序在前，`defaultSort` 接在後面作為次要的排序）、`sortableColumns`、`sortByKey`
- `schema/group.ts`：`groupRows`（多層分組）、`flattenGroups`（把分組攤回畫面的順序）
- **`schema/` 放置處理列的純函數**（`types`、`sort`、`group`、`filter`、`validation`、`relations`、`image`），不使用 reactivity，因此 store、元件、composable 皆可直接呼叫
  - `composables/data/` 只放反應式的包裝（`useTable`、`useSearch`、`useFilter`）
  - 各表的欄位定義在 `schema/tables/`，一張表一個檔案。註冊表 `schema/index.ts` 留在根目錄，作為公開的入口
- `detailOrder`、`formOrder` 分別控制詳細頁與表單頁的欄位順序，為這張表的預設。個別頁面以 `DetailPage`、`FormPage`（與 `DataDetail`、`DataForm`）的 `order` prop 覆寫。欄位的 `showIf` 依這一列的資料，決定詳細頁是否顯示該欄
- 條件式格式：表層級的 `formatRules`，含 `when`、`columns`，以及顏色、粗體、斜體、底線、刪除線、圖示
  - `schema/format.ts` 的 `displayValue` 把文字與格式一起算出，view、`DataDetail`、`DataTable` 都改用此函數，由 `FormattedValue` 統一顯示
  - `formatColumnValue` 仍只回傳字串，供寫回 Sheet、搜尋與 `$label` 使用
  - 多條規則符合時，顏色取第一個，圖示依序全取，字形取聯集
  - 顏色為常用色名，深淺色主題各一組色值。這些顏色登記為 Vuetify 主題的共用色名 `vuesheet-*`（`plugins/vuetify.ts`，引用 Material 色板），其他地方也可使用
- `virtualColumns`：不在 Sheet 上、讀取時才計算的欄位
  - 來源可以是這一列本身、父列（`row.$欄位key`）或子列（`row.$子表_欄位key`）
  - store 掛成列上的 getter，顯示、排序、分組都與真實欄位相同。兩種欄位共用 `ColumnTypes`、`ColumnBase` 的型別骨架
  - 排進 `formOrder` 時，於表單中唯讀顯示，隨輸入即時重算。表單的列經由 `store.withGetters` 掛上同一套 getter
- `labelColumn`：稱呼一列的欄位（欄位 key，省略時為 id），store 掛成 `row.$label`
- `idColumn`：主鍵為 `columns` 中的哪一欄（值為字串的欄位），其值即為 `row.id`
  - 主鍵可以是 `ref`（與父表共用 id 的一對一延伸表），或由使用者輸入。新增時留空，才以選用的 `newId()` 發號
  - 建立後不能修改：編輯表單，與提供 `rows` 的 `askFields` 中唯讀，store 的 `update` 擋下其他途徑
  - `create` 擋下重複的 id，以及剛刪除、尚未推送的 id
  - 不以數字或 `=`、`+`、`-`、`'` 開頭，只能使用 `encodeURIComponent` 不會改變的字元，不能為 `.` 或 `..`
- `TableSchema<Row>`：各表宣告時帶入自己的 Row 介面，欄位 key 與 `type` 依此檢查，虛擬欄位 `value` 的 `row` 有型別。框架端使用不帶參數的 `TableSchema`
- `duration` 欄位：
  - 一段長度，不是時間點。值為 `"時:分:秒"` 字串，時數不設上限（`30:15:45` 合法），Sheet 上即為 `2:30:00`
  - 讀入時接受 `H:mm`（秒補為 00）與 `H:mm:ss`
  - 表單為一般文字框：原生的 `type="time"` 容不下超過 24 小時的值
  - 排序與篩選皆換算為秒後比較，篩選為最短、最長的範圍
  - 🔲 「幾點幾分」的時間點型別尚未實作，須要時再新增
- `boolean` 欄位：
  - 值為 `true`、`false`、`null`，Sheet 上為 `TRUE`、`FALSE`、空白
  - 顯示為是、否。表單為兩個互斥的按鈕，再按一次已選取的按鈕即清空
  - 篩選可勾選是、否、(空白)，排序時否在前。不進入搜尋列
- `date` 讀入時歸零至當天午夜：Sheet 上手動加了時間，看起來相同的兩列排序或篩選的結果也不會不同
- `image` 欄位：
  - 一格一張圖，值為行內 SVG、圖片網址，或 Google Drive 的檔案 id、分享連結
  - 由 `schema/image.ts` 的 `imageSrc()` 依內容判斷後轉換為 `<img src>`。Drive 使用 thumbnail 端點，沿用瀏覽器的 Google 登入。SVG 轉換為 `data:` URI，當成圖片載入，因此不能執行 script
  - 詳細頁自動顯示，列表的圖片於 view 的 `image` 指定，表單為純文字欄位。不進入搜尋與篩選
  - 上傳到 Drive 尚未實作
- `select` 的 `allowCustom`：
  - `options` 只作為建議清單，表單改為 `v-combobox`，輸入其他文字也接受，驗證略過選項檢查
  - 資料的形狀仍為一個字串，顯示與篩選無須知道差別
  - 建議清單另可由欄位的 `suggestedValues: (row, rows) => 值的清單` 算出，接在 `options` 後面。`row` 掛了 getter，可讀取父列與同一個父列的其他子列。`rows` 為這張表的所有列

### 跨表關聯
- `schema/relations.ts` 掃描 schema 的 `ref` 欄位，自動產生關聯圖。新增關聯只須標示 `type: 'ref'`
- store 在每一列掛上每個 ref 欄位的 `$欄位key`（父列）。虛擬的 ref 也掛上，但只有正向，不進入關聯圖
- `formatColumnValue` 遇到 ref 即顯示父列的 `$label`，因此詳細頁、表格、列表、選擇器全都顯示名稱，沒有 ref 專用的元件
- `DataForm` 的 `ref` 欄位為父表整張表的可搜尋下拉清單（`v-autocomplete`），每一項的文字與搜尋比對都是父列的 `$label`。「前往父列」為欄位動作 `goToRefAction`，由頁面自行列出
- store 也在每張父表的列掛上 `$子表_欄位key`：指向這一列的子列陣列，依子表的 `defaultSort` 排序，無須設定
  - 虛擬欄位與頁面直接讀取，無須另外查詢
  - 名稱帶有 ref 欄位，因此同一張子表有兩個 ref 指向同一張父表時（平行邊），各自有一個 getter，不會衝突
- `ensureLoaded(table)` 一併載入父表與子表，並擋下循環
- 連帶刪除：ref 欄位標示 `onDelete: 'cascade'`。父列被刪除時，`store.removeMany` 沿著關聯圖一併刪除子列，可多層遞迴，經過同一條 `patch` + `enqueue`。`ensureLoaded` 一併載入 cascade 的子表
- 沒有子列時刪除父列：ref 欄位標示 `onEmpty: 'delete'`
  - 子列被刪除，或改指其他父列，使原本的父列沒有子列時，`store` 的 `update`、`removeMany` 在寫入後刪除該父列。刪除經過 `removeMany`，可多層往上遞迴
  - 只在子列減少時檢查，剛建立的空父列不受影響

### 資料存取
- `stores/tables/`：每張表一份全 App 共用的快取，同一張表不重複呼叫 API
- `useTableList`、`useSortedTableList`、`useTableRow`（同一個 `data/useTable.ts`）都讀取同一份快取
- 寫入經過 store 的 `create`、`update`、`remove`、`removeMany`：修改快取並進入佇列，呼叫端無須手動 refresh
- 待寫入佇列 `pending`（含合併規則）與手動推送。四個寫入 action 為同步，只修改快取與佇列
- `notify()`：全 App 一則 snackbar 訊息，由 `AppShell` 顯示。與 `confirm()` 一起放在 `shell/useDialogs.ts`
- 新增的 id 由前端決定：主鍵欄的值，為空時才以 `newId()` 發號，格式由各表決定（`prefixedId('TPL')` 為現成的前綴式）。後端收到已存在的 id 即視為重送，回傳既有的那一列
- 跨表算出的值依共用快取的 reactivity 自動重算，無須跨表的失效機制

### 累積寫入
修改先累積在前端，由使用者按同步時才一次寫入 Sheet。設計與實作見 [vue-build/docs/topics/store.md](vue-build/docs/topics/store.md)。
- 佇列 `pending`、合併規則、`flush`、`hasPending`、`flushing`、`flushError`
- 四個寫入 action 改為同步，只修改快取與佇列
- 流程存檔點 `beginFlow`、`commitFlow`、`rollbackFlow`，供連續動作使用。流程進行中 `flush` 被擋下
- App Bar 最右側的同步按鈕：`refresh()` 即推送，再重新抓取所有已載入與載入失敗的表。未推送時有圓點標記（失敗時轉紅），並以 `beforeunload` 攔截關閉
- 表單開啟時，同步按鈕停用：`useSyncHold` 持有 `holdSync()`，以 `canSync` 判斷
- flush 失敗時保持「未推送」的狀態，並以 snackbar 回報錯誤，使用者再按一次即可。整批重送，不做逐列補償
- **重新抓取前一定先 flush**，佇列未清空時不重新抓取。沒有「只重新抓取一張表」的 API
- 跨表的寫入順序不影響結果：Sheet 沒有外鍵約束，後端也不做合法性驗證，因此父表與子表的寫入先後不影響結果
- `flush` 把整個佇列（跨所有表）攤平成一串 operations，**以一個請求送出，全有全無**：成功才清空佇列，失敗時佇列不變，使用者再按一次即可（見 [docs/api.md](docs/api.md)）
- 佇列只存於記憶體，不寫入 `localStorage`

### 共用元件庫
- 列表：
  - `DataList`：卡片式的單一列，含長按多選
  - `DataProfile`：profile 的單張卡片，動作收於 ⋮ 選單，含長按多選
  - `DataCard`：card 的單張卡片，四層版面，含長按多選
  - `DataGallery`：gallery 的單一格，含長按多選
  - `ListLayout`：各列的排法，依序往下排列或格狀排列
  - `ListField`
  - `CountLabel`：名稱加上列數的小標籤，分組標題與子表區塊共用
  - `GroupedList`：多層、可收合的分組，標題帶有列數
  - `DataTable`：表格式列表，也用於詳細頁中內嵌的子表表格。`columns` 可指定虛擬欄位。`widths` 為各欄指定最大、預設、最小三種欄寬，程式量出內容寬後固定每一欄的寬度。`wrap` 使放不下的格子換行。`fixed` 使前幾欄於橫向捲動時固定
- 詳細：
  - `DataDetail`：欄位區，自動顯示虛擬欄位。`editable` 的欄位為快速編輯
  - `DetailField`：標籤與值左右並排或上下兩行。全站預設為 `config/app.ts` 的 `detailFieldLayout`，各頁以 `DetailPage` 的 `layout` 覆寫
  - `DetailHeader`：選用的標頭區塊
  - `InlineField`：快速編輯的一欄。打字類在失焦或按 Enter 時寫入，其餘欄位一修改就以 `store.update` 寫入，驗證不通過時不寫入
- 表單：`DataForm`。單一欄位的輸入元件為 `FieldInput`，依 `column.type` 自動選擇，表單與快速編輯共用
- 整頁版型（皆為泛型元件，slot 的 `row` 帶有呼叫端的 Row 型別）：
  - `PageState`：載入中、載入失敗、找不到資料，全 App 唯一一份，資料取得後才顯示 slot
  - `FormPage`：新增、編輯頁，內部包著 `PageState`，另外處理送出失敗
  - `DetailPage`：詳細頁，含欄位區、左右滑動切換列、上一列與下一列的箭頭、FAB
  - `ListPage`：列表頁，逐列顯示卡片，或以 `#rows` slot 把全部的列交給表格，或以 `groups` 交給 `GroupedList`。另外加上 FAB 並發布列表順序，分組時先執行 `flattenGroups`
  - `ChildList`：詳細頁中的子表區塊，含帶有列數的標題、顯示上限、沒有子列時的文字，右下角一行「展開」與頁面提供的動作
- 詳細頁的順序分工：
  - 欄位依 schema 的 `detailOrder`，頁面可以 `order` 覆寫
  - 區塊（例如 `ChildList`）依頁面的 slot：`#top` 在欄位上方，default 在下方
  - 刻意不支援插在特定的欄位之間。那種版面直接不使用 `DetailPage`：它的 template 只有二十行，元件都是現成的
- 子表區塊的「展開」是**一個真正的頁面**（`/父表/:id/子表`，範本為 `template/pages/child-list.vue`，一條關聯一個檔案，約 20 行），不是就地展開的版面。返回鍵、轉場、App Bar 的標題因此都是現成的。`ListPage` 也發布這份順序：從父列的子列點進某一列時，上一列、下一列在同一個父列的子列之間切換
- 狀態只出現在兩個地方：產生狀態的 composable，與顯示狀態的 `page/` 版型。`DataList`、`DataForm`、`DataDetail` 等內容元件都不處理 loading 與 error
- 其他元件：`ViewActions`（view 的列上動作：一排按鈕、⋮ 選單或左右各兩格）、`PageFab`、`TabPage`、`RecordNav`、`AppDialog`、`ConfirmDialog`、`FieldsDialog`（只顯示幾欄的 `DataForm`）
- `TabPage`：
  - 頁籤列畫在 `TabPage` 的最上方，以 `position: sticky` 固定於 App Bar 的下緣
  - 每個頁籤外包一層 `TabPanel`，`provide` 一份「是否為目前的頁籤」（`panelActiveKey`）
  - 看過的面板一直掛著，`v-window` 以 `v-show` 切換
  - `PageFab`、`registerSlot`（App Bar、底部動作）、`useListOrder` 判斷「是否在作用中」的條件皆為「KeepAlive 狀態 && 目前的面板」。因此一個頁籤放一整張表的列表、各自掛上自己的 FAB 與動作是可行的
  - 不在 `TabPage` 中的頁面一律視為目前的頁籤，既有的頁面無須修改
  - 動作的兩個 watch 刻意分為 `pre`（清除離場的動作）與 `post`（設定進場的動作），同一輪切換時，順序才不會反過來變成空的

### 搜尋、篩選與排序
- **可搜尋、可排序的欄位是表層級的 key 清單**：`searchable: ['name', 'date', …]`、`sortable: [...]`，真實欄位與虛擬欄位皆可列入
  - 與 `detailOrder`、`formOrder`、`defaultSort` 的形狀相同。欄位本身只描述資料：key、label、型別、必填、選項、驗證
  - **清單的順序即篩選抽屜與排序面板上的順序**。型別為 `RowKey<Row>[]`，key 打錯時 TS 擋下
- `searchable` 一份清單管兩件事：`text`、`ref` 為搜尋列的比對對象，`select`、`number`、`date`、`duration` 為篩選抽屜的欄位
- `useSearch(query, rows, schema)`：
  - 純函數式。每一列的可搜尋文字（searchable 欄位的顯示文字接起來，轉為小寫）只隨 rows 重算，輸入時只執行 `includes`
  - query 依空白切詞，雙引號包住的部分視為一個詞，每個詞都須符合（AND）
- `useFilter(filters, rows, schema)`：
  - `Filters = { 欄位key: { values?, min?, max? } }`。select 使用 `values`（`null` 為空白），number、date 共用 `min`、`max`
  - 欄位之間為 AND，`values` 之間為 OR
  - 設定了範圍而值為空的列排除。select 只有勾選空白時，才保留空值的列
- **query 與 filters 皆屬於頁面**：
  - 以 `useListControls(query, { tables, current? }?)` 登記後，App Bar 才出現放大鏡。按下後，整條 App Bar 換成輸入框
  - 提供 tables 時，輸入框內的最右側多一個篩選按鈕（有條件生效時為主色），開啟右側的抽屜。抽屜屬於 `AppShell`，內容為 `FilterPanel`，修改即時生效
  - 按 ← 關閉時，清除 query 與所有表的篩選。換頁時自動收起。回到仍帶有 query 或篩選的頁面時，自動重新開啟
  - 抽屜開啟時，`PageFab` 讓開（`useOverlay` 的 `overlayOpenKey`）
  - 左右兩個抽屜皆設定 `order="-1"`，連同 scrim 一起蓋在 App Bar 之上。Vuetify 的 layout 為 `z-index = 1000 + 層數×2 − 註冊順序×2`，越早註冊越上層，順序由 `order` 決定。因此抽屜開啟時，碰不到搜尋列與右上角的按鈕
  - 頁面的串接方式為 `rows → useFilter → useSearch → 依頁籤切分`，跨所有頁籤
- **一頁可以有多張表的條件**：
  - `tables: [{ schema, filters, rows }, …]`：每張表各自一份 `Filters`，同時生效。頁籤各接一張表時，每個面板各用自己的那一份過濾
  - query 為全頁共用一份
  - 抽屜第一層的上方多一排表的 chip，決定目前編輯的表。`current`（頁面的頁籤 v-model，值與 `tableLabel` 相符）決定開啟時停在哪張表，使用者仍可自行切換
  - 「清除」只清除目前那一張表，按 ← 關閉搜尋才全部清除
  - 單表的頁面，`tables` 提供一個元素，看不到 chip
- 抽屜分兩層：
  - 第一層為可篩選欄位的清單，順序即 `searchable` 清單的順序，略過屬於搜尋列的 `text`、`ref`。有條件的欄位，名稱下方以小字顯示目前的條件，右側有一個主色的圓點
  - 第二層為單一欄位的值。select 為一列一項的 checkbox：只列出 rows 中出現過的值，依 `options` 的順序，`options` 沒有的排在最後，有空值時才有「(空白)」並排在最後。number、date、duration 為兩格的範圍
- 只為搜尋存在的虛擬欄位（例如父表把所有子列的名稱接起來），照常宣告並列入 `searchable`。不排進 `detailOrder` 即不顯示
- **排序**：
  - 列入 `sortable` 的欄位才出現在排序面板，順序即清單的順序
  - `sortable` 與 `searchable` 為分開的兩份清單：備註等長文字無須排序。`image` 列入也略過
  - `useListPage` 一併登記，因此列表頁無須設定。App Bar 的放大鏡右側多一個排序按鈕，非預設的排序時為主色
  - **一次只依一欄排序**：點擊一欄即選取，再點擊同一欄即切換升降。`defaultSort` 一律接在後面，作為次要的排序
  - 工具列的「清除」回到只依 `defaultSort` 排序，位置與外觀和篩選的「清除」相同
  - 即時生效。重新整理後回到預設，不保存
- 排序面板 `SortPanel` 與 `FilterPanel` **共用同一個右側抽屜**（`AppShell` 的 `drawerMode`），一次只顯示一種。抽屜蓋住 App Bar，切換到另一種須先關閉抽屜，因此無須撰寫互斥的邏輯。兩個面板上方的表 chip 為共用的 `TableChips`
- 比較方式的特例：
  - `ref` 依父列的 `$label`：值為 id，依 id 排序沒有意義
  - `select` 依 `options` 的宣告順序：狀態有先後，字典順序不正確。`options` 沒有的值排在其後，彼此依文字比較
  - 文字比較時，其中的數字依大小排序，例如 `2` 在 `10` 之前
- **排序與分組二選一**，框架不介入：
  - 分組會把原本的順序壓縮為組內的順序，因此頁面在 `sort` 不是 null 時，自行以 `rows` 取代 `groups`。有分組的列表頁即如此處理
  - 點擊一列時，`ListPage` 發布當時畫面上的順序，詳細頁的上一列、下一列與畫面一致

### 動作系統
說明見 [vue-build/docs/topics/actions.md](vue-build/docs/topics/actions.md)。
- `PageAction` 型別（`{ key, label, icon, onClick, confirm?, display? }`）：FAB、App Bar、底部動作列、詳細頁的欄位動作共用同一種描述。內建 builder 的 label、icon 可以最後一個參數 `ActionLook` 覆寫，與行為的 options 分開
- 通用的 builder：`newAction`、`editAction`、`deleteAction`、`bulkDeleteAction`、`quickEditAction`
  - 皆為一般函數，回傳一個 `PageAction`，不適用時回傳 `null`
  - 不以列為參數的，由 `use表名Actions` 以 `useAction` 包裝為 `ComputedRef<PageAction | null>`
  - 以列為參數的（編輯、刪除）為函數。列表的 view 與欄位動作直接以該列呼叫，詳細頁以 `useRowAction` 綁定至目前那一列
  - 刪除目前詳細頁顯示的那一列時，自動離開
- 欄位動作（`DataDetail` 的 `fieldActions`，欄位 key → `(row) => PageAction | null`，每一欄一個，整格可點擊）：`goToRefAction`（前往 ref 的父列）、`openUrlAction`（開啟新分頁）、`setFieldAction`（立即改成某個值，可帶 confirm）
- 須確認的動作只要宣告 `confirm`：`useActionRunner` 先 `await confirm()` 再執行，錯誤顯示於 snackbar。頁面無須放置 `ConfirmDialog`
- `confirm()`、`choose()`、`askFields()`：
  - 分別用於是／否、多個去向（回傳按下的按鈕的 key，取消時為 `null`）、詢問幾個欄位
  - 皆為 module 層級的狀態，加上 `AppShell` 掛載一個實例與 promise。前兩者共用同一個 `ConfirmDialog`
  - `quickEditAction` 以 `askFields()` 把選取的多列改成同一個值。欄位由設計者決定，只選取一列時顯示目前的值
- 每張表的動作（包括刪除選取的列）一律從 `use表名Actions(options)` 取得，每一項為一個動作，用不到的為 `null`。一個位置放置哪些動作，由頁面組成陣列。各位置接收 `(PageAction | null)[]` 並略過 `null`
- `useAppBarActions()` 以 provide／inject 把動作註冊到 App Bar，數量多時自動收成下拉選單
- `useBottomActions()` 把動作註冊到螢幕最底端，暫時取代導覽列，用於表單頁的取消與送出。兩者共用 `useActionSlot` 的 KeepAlive 防護
- `PageFab` 依數量，自動在固定顯示與 speed-dial 之間切換

### 表單與多選
- `useCreateForm`、`useEditForm` 收掉新增與編輯的重複邏輯：初始值、載入、送出、導覽、錯誤狀態。取消與送出也由兩者自行掛上底部動作列，頁面只剩「這是哪張表」
- 新增表單的預設值有三層：schema 的 `default` → `newAction` 經由 `history.state` 帶入的值 → `useCreateForm` 的參數
- 前端驗證：`schema/validation.ts` 的 `validateRow` 一份程式
  - 內建 `required`、`min`、`max`、`select` 的選項。其他規則由欄位的 `validate(value, row)` 自訂
  - 表單層與 `askFields` 於送出前逐欄提示，store 的 `create`、`update` 於寫入前再檢查一次（拋出錯誤，不修改快取）
  - 後端只檢查結構完整性。分工見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md)
- `useMultiSelect` + `useLongPress`：
  - 長按進入多選，多選的狀態由「是否選取了任何一列」推導
  - `itemProps(id)` 為每一列須綁定的屬性（`selectable`、`selectMode`、`selected`、長按與點選），列表元件與分組列表共用同一份
- 分組或分頁籤的列表也使用 `ListPage`：一個頁籤一個 `ListPage`，各自計算狀態、FAB 與列表順序，依面板的訊號決定哪一份生效，頁面無須知道目前是哪個頁籤
- 列表頁的資料層 `useListPage(table, schema)`：
  - 依序處理整張表 → 排序 → 篩選 → 搜尋，並一併登記 App Bar 的放大鏡與排序按鈕，另提供多選，一次回傳
  - 回傳值包括 `sort`，頁面以此決定是否分組
  - 一頁接多張表時，傳入 `search: false`，改由頁面自行登記，再傳入 `query`，使每張表共用同一條搜尋字串
- 多選的出口：
  - `useMultiSelect` 把退出的方式登記到 `appBarSelectionKey`，只提供一個函數，按鈕的外觀由 `AppShell` 決定，與放大鏡的分工相同。頁面無須設定
  - 該按鈕固定在同步按鈕左側，**不收進「⋮」**：收進選單即沒有明顯的出口
  - 「是否已登記」即為「目前是否為多選模式」。多選時，搜尋按鈕先讓位，把空間留給對選取的列的動作
- 離開即取消選取：`onDeactivated`（KeepAlive 的列表換頁時）與 `useCurrentTab()`（換頁籤時）自動清除，頁面無須設定。頁籤的訊號取自所在的 `TabPage`，同一張表的頁籤與各自一張表的頁籤讀到同一份，因此兩種頁籤形狀無須各寫一套
- 刪除選取的列經過動作的 `confirm`

### 連續動作
設計與實作見 [vue-build/docs/topics/actions.md](vue-build/docs/topics/actions.md)，離開前的確認見 [vue-build/docs/topics/pages.md](vue-build/docs/topics/pages.md)。
- 流程存檔點 `beginFlow`、`commitFlow`、`rollbackFlow`：一次還原一段流程對快取與佇列的修改。套疊時直接拋出錯誤，流程進行中 `flush` 被擋下
- `useFlow.ts`：`runFlow`（外殼：存檔點加上 commit 或 rollback）、`runStep`（開啟表單並等待送出）、`resumeStep`（表單交棒）、`FlowCancelled`、`hasEarlierSteps`
- `router.afterEach` 中止等待中的步驟（reject）並回滾。`useCreateForm`、`useEditForm` 送出成功後，先呼叫 `resumeStep`
- 第一步使用 `push`，之後使用 `replace`
- 離開前的詢問：`useLeaveGuard` 的 `router.beforeEach`，返回鍵、導覽列、修改網址、底部的取消皆經過同一條路徑。第二步之後一律詢問，否則依表單是否修改過判斷
- 範本 `table/use__Table__Actions.ts` 的回傳物件末尾有寫法示範（註解），說明見 [vue-build/docs/topics/actions.md](vue-build/docs/topics/actions.md) 的「連續動作（流程）」。專案端的第一條流程，見 production 分支的 PROJECT-ROADMAP

### 路由
- 登入頁與導向（`config/app.ts` 的 `authMethod` 不是 `'none'` 時）：
  - 全域 guard 連第一次開啟都會檢查。沒有 token 時，轉到 `/login?redirect=…`，登入後回到原本的目的地。側邊欄可登出
  - 每個請求帶上 token。後端回傳過期或無效時，清除 token，回到登入頁
  - 重新登入後，重新抓取用過的表，包括載入失敗的表，不推送
  - 尚未完成的部分，見「未完成」的「後端」
- `useRouteId()`：路由參數讀取一次即固定，依 `route.fullPath` 作為 key 成立，離場動畫期間不會被目的地的 id 汙染。拿掉 key 時，開發模式下警告
- `leaveAfterAction()`：完成動作後以瀏覽器的返回離開，不把已完成的表單頁留在歷史中
- `provideListOrder`、`useSiblingNav`：點擊一列時，列表發布畫面上的實際順序，詳細頁據此切換上一列、下一列（箭頭與手勢），切換使用 `replace`

### 後端的對接層與假後端
- `services/mock/`：記憶體中的資料表，以及可運作的 batch（create、update、delete，全有全無）。與真正的 Sheet 一樣只存放原始字串
- 純記憶體，重新整理頁面後回到 CSV 的原始內容
- `services/appScript.ts` 為對後端唯一的出入口，**真正的 fetch 已實作**：GET 讀取整張表、POST 送出 batch、拆開 `{ success }` 信封、把 `code: 'modified'` 轉成 `ConflictError`。未設定 `VITE_APPS_SCRIPT_URL` 時使用假後端，因此 clone 後不填任何設定即可執行。真後端穩定後，整個 `mock/` 可以刪除
- POST 的 `Content-Type` 刻意為 `text/plain`，原因見 [docs/api.md](docs/api.md)

### 後端（Apps Script）

程式位於 `apps-script/`，須填寫的只有 `Config.gs`：試算表 id、「表代稱 → 分頁名稱 + ID 欄表頭」的對照、表頭的列號。細節、部署步驟與實測結果，見 [apps-script/README.md](apps-script/README.md)。

- 已實作，並於 **2026-10-02 對實際的 Sheet 完成測試**：入口與信封、整張表的讀取、batch（鎖、衝突比對、全有全無）、表頭對應、結構完整性檢查
  - 實作規則、值寫入儲存格的行為與實測結果，見 [apps-script/README.md](apps-script/README.md)
  - 字串轉義由前端處理，見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md)
- 認證：`Config.gs` 的 `AUTH` 啟用時，以登入換取 token（加鹽的 SHA-256 比對帳號密碼、HMAC 簽章、30 天效期、剩不到一半時自動續期），每個請求先驗證 token，才開啟試算表。設計見 [docs/auth.md](docs/auth.md)
- 前後端的介面（GET 整張表、POST 一個 batch、全有全無、id 由前端產生、不回傳資料列），見 [docs/api.md](docs/api.md)
- 待處理的項目（Google 登入、Hooks），見「未完成」

### 資料一致性
- 推送前比對整個試算表檔案的 `modifiedTime`，由後端在同一把鎖中比對。衝突時詢問使用者「放棄並重新抓取」或「強制推送」。約定見 [docs/api.md](docs/api.md) 的「資料一致性」，前端的處置見 [vue-build/docs/topics/store.md](vue-build/docs/topics/store.md)
- 衝突時，不把佇列重新套用到新資料上

### 列表效能
上千列的列表頁做過一輪渲染成本的處理：每一列的連結元件、`ref` 的父列查詢、畫面外的列是否排版。量測方法、數字與判讀方式，見附錄 [vue-build/docs/perf.md](vue-build/docs/perf.md)。

### 文件與範本
- 根目錄的 `README.md` 為索引。跨兩端的介面在 `docs/api.md`。前端的文件在 `vue-build/docs/`：`architecture`、`perf`，`topics/` 為各項機制，`design/` 為設計指南，`components/` 為每個元件一份
- `vue-build/template/`：新增一張表所需的全套檔案，**保留為真正的檔案**
  - 複製整份檔案比從程式區塊中挑選方便，而且在 `main` 分支上，範本是唯一的頁面範例
  - 範本中只保留最小的骨架，以及每個檔案開頭一段「應閱讀的文件」。選項目錄與說明一律寫在 docs，不保留第二份會不一致的副本

---

## 未完成

### 後端

- 🔲 **Google 登入**（前端 `authMethod: 'google'`）：使用同一套約定，Google 的 ID token 放進登入的 `credentials`，見 [docs/auth.md](docs/auth.md)
- 🔲 Hooks 機制（見 [docs/api.md](docs/api.md)）
- `bulkCreate`：等確實有匯入的需求時再處理

### Schema
- **可修改的 id**：延後，等確實須修改 id 的情境再實作。主鍵一修改，所有記著舊 id 的地方都須跟著替換：
  - 子列的 ref：沿著關聯圖連帶更新為新 id，類似連帶刪除。子表的 id 欄本身為 ref 時須遞迴
  - 待推送佇列：未推送的新增直接替換 id。已在 Sheet 上的列，推送前後端仍為舊 id，佇列須記錄一份「新 id → 舊 id」的對照，否則同一批中之後的操作找不到列
  - 畫面：詳細頁的網址、KeepAlive 的快取、列表發布的順序、多選的 id、儀表板的選取，皆記著舊 id，編輯後須以新 id 取代
  - 編輯時清空 id 欄即重新發號，也屬於修改 id

### UI 功能
- 關聯選擇器的 `allowCreate`：清單最上方一項「＋ 新增…」，開啟父表的新增表單，返回後自動選取。看起來是 `runStep('/父表/new')`，但表單頁作為呼叫端與動作作為呼叫端不同，須先解決四件事：
  - 返回時，`useCreateForm` 的 `onActivated` 會重置表單，使用者填到一半的內容會遺失。須能分辨「從子步驟返回」與「重新進入」
  - 離開表單頁去開啟父表的新增時，會被 `useLeaveGuard` 攔下，詢問是否放棄
  - 這張表單本身可能就是某條流程的一步（例如「新增父表接著新增子表」的第二步）。`runFlow` 不能套疊，而且 `runStep` 在流程中使用 `replace`，會把目前這張表單頁換掉
  - 完成後須回到原本那張表單（`back`），不是像流程一樣往前走
  - 等確實常用時再實作。目前的替代路徑：先到父表新增，再回來選取
- **schema 是否拆成 `fields.ts`、`order.ts`**（評估過，暫不實作）：
  - 能乾淨切分的只有表這一層：`fields.ts` 放 Row 介面、`tableLabel`、`idColumn`、`newId`、`labelColumn`、`columns`、`virtualColumns`，`order.ts` 放 `detailOrder`、`formOrder`、`defaultSort`，`index.ts` 把兩者組合起來
  - 切在欄位內部（型別、必填與標籤、可搜尋分開）已否決，那會使每個 key 須寫兩次
  - 目前順序那一半只有三個欄位，拆完是一個五行的檔案加一個 import，不划算
  - 回頭重看的時機：順序那一半增加到 15～20 行時
- **依顯示情境判斷的條件**（暫不實作）：
  - 目前 schema 中以列判斷的條件，都只收到這一列，不知道自己用於哪一頁、哪種版面。這些條件包括 `formatRules` 的 `when`、`showIf`，以及 `suggestedValues`、`validate` 這類接收列的函數
  - 實作時比照 AppSheet 的 `CONTEXT()`，讓這些函數都能以同一種方式取得情境（例如多一個 `context` 參數），不另設限定位置的宣告欄位，條件才能自由組合
  - 顯示的路徑本身知道位置（`DataDetail`、`DataTable`、`DataForm`）。view 則須由各版面元件呼叫時，告知自己是哪種版面
- **列表的預設排序由頁面覆寫**（等確實需要時再實作）：
  - 欄位的順序已可由頁面的 `order` 覆寫，`defaultSort` 仍只有 schema 一份，同一張表在不同的列表頁無法有不同的預設排序
  - 做法同 `order`：schema 那一份作為預設，頁面經由 `useSortedTableList` 的參數覆寫

### 頁面類型（對照 AppSheet）

| AppSheet | 此框架的名稱 | 現況 |
| --- | --- | --- |
| deck | **deck** | ✅ 卡片式列表（`DataList`），含每一列的動作按鈕（`ViewActions`） |
| table | **table** | ✅ `DataTable` |
| detail | **detail** | ✅ 詳細頁，含選用的標頭區塊（`DetailHeader`），見下方 |
| form | **form** | ✅ 新增、編輯頁 |
| card（小） | **profile** | ✅ `DataProfile`，見下方 |
| card（大） | **card** | ✅ `DataCard`，見下方 |
| gallery | **gallery** | ✅ `DataGallery`，圖片加上標題的格狀排列，見下方 |
| chart | **chart** | ✅ `ChartPage`、`DataChart`、`DataStat`，見下方 |
| dashboard（分頁） | **tab** | ✅ `TabPage` |
| dashboard（全部顯示、連動） | **dashboard** | ✅ `DashboardPage`，見下方 |
| calendar | — | 把資料當成事件放上日曆，通常依日期與時間欄位。暫不考慮 |
| map | — | 把座標標在 Google 地圖上。暫不考慮 |
| onboarding | — | 導覽頁。暫不考慮 |

**視圖（view）**：deck、profile、card、gallery 與詳細頁的標頭，共用同一套「欄位與位置的對應」，實作於 `schema/view.ts`。
- `defineView(schema, {…})` 與 `defineCardView(schema, {…})` 回傳一個函數，傳入一列即回傳各位置的內容與該列的動作。欄位定義在建立時即查找完畢
- view 定義於頁面並交給版面元件，schema 本身不含 view
- 目前 deck（`DataList`）、profile（`DataProfile`）、card（`DataCard`）、gallery（`DataGallery`）與詳細頁的標頭（`DetailHeader`）皆已套用，card 以外皆使用 `defineView`

view 的規則：
- 一組位置（`FieldGroup`）：`title`、`subtitle`、`image`、`summary`，以及只有 deck 使用的 `aside`
  - 每個位置皆可省略：省略的位置不顯示、不佔位置。已指定但這一列沒有值的位置保留，各列因此對齊
  - 可填入欄位 key，或每一列皆有的 `id`、`$label`（`keyof RowBase`）
  - 須合併多個欄位，或顯示父列、子列的資訊時，宣告為 `virtualColumns`
- deck 的四個角：`title` 左上，`subtitle` 右上，`summary` 左下，`aside` 右下，`image` 為左側的縮圖
- card 使用兩組（`defineCardView`）：`header` 為第 1 層（`image` 作為頭像），`body` 為第 2、3 層（`image` 作為大圖，`summary` 為摘要）。詳細頁的標頭相當於只有 `body` 一組，因此直接使用 `defineView`
- 動作 `actions: (row) => (PageAction | null)[]` 與欄位定義於同一個 view，依位置排列：
  - card 與詳細頁標頭的前兩個置於左側，後兩個置於右側，`null` 表示空位
  - deck 與 profile 略過空位
  - `PageAction` 新增 `display: 'icon' | 'text'`

**deck 的動作按鈕**（✅ `ViewActions`）：
- 置於右下角欄位的下一行，由左往右排列，整組靠右
- 沒有動作時不佔高度。多選模式下隱藏
- 按鈕為原生 `<button>` 加上圖示，不使用 `v-btn`，考量列數多時的實例成本（見 [vue-build/docs/components/view/ViewActions.md](vue-build/docs/components/view/ViewActions.md)）
- 🔲 尚未依 [vue-build/docs/perf.md](vue-build/docs/perf.md) 的方法，量測加入動作列前後的差異

**profile 與 card** 與 deck 的不同之處：一張張分開的卡片，有間隔，不是連在一起的清單。點擊卡片進入詳細頁，支援長按多選。
- **profile**（✅ `DataProfile`）：
  - 左側為圓形頭像，中間為標題與副標，右側的 ⋮ 選單收納動作
  - 未指定頭像時不顯示頭像。只有一個動作時也收入選單
  - 選單於第一次按下 ⋮ 時才建立（ViewActions 的 `variant="menu"`），每一列平時只有一個原生按鈕
  - 間隔由卡片本身負責
- **card**（✅ `DataCard`）：上下四層，未指定任何位置的那一層整層隱藏。已指定大圖但沒有圖片時，以灰色方塊佔位
  1. 圓形頭像，以及標題與副標（沒有選單）
  2. 圖片：固定 16:9，裁切填滿，載入前即確定高度
  3. 標題、副標、摘要。欄位與第 1 層分別指定，摘要最多三行
  4. 最多四個動作：左兩格、右兩格，每一格各自選用圖示或文字（ViewActions 的 `variant="slots"`，`null` 保留為空格）
  - 多選時，勾選圖示疊於卡片左上角，不受各層有無內容影響
  - `contain-intrinsic-size` 依出現的層加總出替代高度，以 inline style 指定

**gallery**（✅ `DataGallery`）：格狀排列，`ListPage` 的 `layout="grid"`（`ListLayout`，分組時每一組各自排列）。手機上恰為兩欄，平板與桌面自動增加欄數。
- 每一格固定 3:4，直角，帶有陰影：上方為正方形圖片，下方為標題與副標各一行，⋮ 選單置於右下角
- 沒有圖片時，以同樣大小的灰色方塊佔位，格線才會對齊
- 支援長按多選，勾選圖示疊於圖片左上角

**詳細頁的標頭區塊**（✅ `DetailHeader`，由 `DetailPage` 的 `header` prop 開啟，其中每一項皆為選用）：
- 置於 `#top` 之上、整頁最上方，顯示這一列的重要資訊
- 結構為 card 去掉第 1 層：第 3 層的標題、副標、摘要疊在第 2 層的圖片上，第 4 層的動作接在圖片下方，不疊在圖上
- 有圖片時：寬度貼齊畫面兩側，固定 16:9，裁切填滿，高度以 `40vh` 為上限。文字為白色，底下墊一層由透明至深色的漸層
- 沒有圖片時：背景透明，寬度與欄位區相同，高度只有文字的高度

**chart**（✅ v1.7。規則見 [vue-build/docs/topics/chart.md](vue-build/docs/topics/chart.md)，外觀與操作見 [vue-build/docs/design/chart.md](vue-build/docs/design/chart.md)）：以一張表的列畫一張圖表。
- ✅ `defineChart` 的輸入型別，以及開發模式下的檢查（`schema/chart.ts`）
- ✅ `compute`：分組、統計、排序，以及合併為「其他」
- ✅ `DataChart`：Chart.js 的建立、更新與銷毀，以及顏色。Chart.js 延遲載入
- ✅ `ChartPage`：載入狀態、錯誤、高度與點擊，以及範本 `template/pages/chart.vue`
- ✅ 圖表忽略自己分組欄與系列欄上的條件，並為被選的組與系列加上高光
- ✅ 點擊圖例寫入篩選，儀表板中點擊圖表寫入篩選
- ✅ 文字統計（`type: 'stat'`）：`DataStat` 以文字顯示每一組的每一個數值，數字可加「+」、單位與顏色
- ✅ 以 `colors` 依名稱指定組或 dataset 的顏色，色名與條件式格式相同
- ✅ 軸上的值皆為整數時，刻度只取整數
- ✅ 直的數值軸，刻度間距的下限加大為約兩行字高
- ✅ 自訂的統計：`stat` 可為以一組的列為參數、回傳數值的函數。第二個參數提供各組的列與此組的位置
- ✅ 圖例與橫向長條圖的分組名稱放不下時換行
- ✅ 文字統計置於儀表板的面板中時，以面板的外框為框（`usePanelBordered`）

**tab**：一次只顯示一個面板，以頁籤切換，即現有的 `TabPage`。

**dashboard**（✅ `DashboardPage`、`DashboardPanel`，外觀與操作見 [vue-build/docs/design/dashboard.md](vue-build/docs/design/dashboard.md)）：所有面板同時出現。
- 手機與電腦皆以方格座標二維排版，手機寬 12 格，電腦寬 48 格。每個面板可指定寬與高的格數，或交由自動排版
- 面板可就地展開為整頁
- 面板之間的連動由頁面以 `useDashboardLinks()` 手動接線：
  - 每個面板自動輸出選取的列與列出的列，其他面板以 `scope` 接收。列表只保留其中的列，詳細頁在剛好一列時顯示這一列
  - 開啟 `selects` 的列表點擊即選取，不換頁。例如在列表點擊一個項目，旁邊的詳細面板即顯示該項目
  - 選取的列不再列出時自動取消
- 每個面板以 `shared` 決定是否加入儀表板共用的搜尋、篩選與排序。預設不加入，面板有自己的一份
- 🔲 form 在窄面板中是否須調整版面，尚未確認

### 列表效能（剩下的部分）
- 🔲 見 [vue-build/docs/perf.md](vue-build/docs/perf.md) 的「尚未進行的部分」

### PWA 與離線
- 尚未建立 manifest.json 與 Service Worker，`vite-plugin-pwa` 未安裝
- App 圖示尚未決定，名稱在 `src/config/app.ts`

### 桌面版
- 桌面版的導覽 UI 待定：側邊欄是否預設開啟、底部導覽列是否在桌面上隱藏，等處理桌面的體驗時再決定。側邊欄目前於電腦版開啟後與內容並排，換頁時不收起
- 手機與電腦排版的切換門檻待定：`useCompactLayout()` 暫時沿用 Vuetify `mobile` 的 1145px。平板直放應使用 dashboard 的 48 格，門檻可能須調低，例如 840px

### 部署
- 前端的靜態託管（Vercel、Cloudflare Pages），須注意 SPA fallback
- 存取權限：
  - 前端直接 `fetch` 時，只有「任何人」連得上。「只有我自己」須由前端另外取得 Google 的 OAuth access token，尚未試過
  - 要限制使用者時，使用選用的程式內認證（見 [docs/auth.md](docs/auth.md)）
  - 不使用認證時，網址為唯一的保護，只存放於不進版控的 `.env`
- API 配額用量的監控
