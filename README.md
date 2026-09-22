# Google Sheets 後端 + 自訂 GUI App — 框架

用 Google Sheet 當後端、自己寫前端 GUI（外觀仿 AppSheet）的通用框架。

> 這個 repo 的程式碼與文件都由 Claude（Anthropic 的 AI）生成。作者提供想法與需求、確認程式邏輯、在實機上驗證。

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

前端不需要為每個關聯另外寫東西：在子表的 schema 欄位標 `{ type: 'ref', refTable: '父表' }` 就完成了，`schema/relations.ts` 會在載入時掃過所有 schema 自動算出關聯圖。標好之後任何地方顯示這個欄位都是對方的**名字**而不是 id（要能從 detail 點過去就再列一個 `useGoToRefAction`），`DataForm` 把它做成可搜尋的下拉清單（`v-autocomplete`，父表整個載進共用快取）。

一列的名字由**它自己那張表**決定：`TableSchema.labelColumn` 指一個欄位 key（真實或虛擬都行），省略就是 id。「父表用底下第一筆子資料的名字稱呼」就是在父表上定義一個虛擬欄位、`labelColumn` 指它；指向父表的 ref 欄位什麼都不用寫。實作上 store 在每一列掛三種 getter：`row.$label`（這一列的名字）、每個 ref 欄位一個 `row.$欄位key`（父列）、每張指向這張表的子表一個 `row.$子表_欄位key`（子列陣列，照子表的 `defaultSort` 排）。`formatColumnValue` 遇到 ref 就回 `row.$欄位key.$label`——所以 detail、表格、列表卡片、選擇器清單顯示的是同一個字串，沒有任何一處需要知道 ref 的特殊性。`ensureLoaded` 會把父表與子表一起載，getter 才有東西讀。選擇器只能選到存在的列，所以 `ref` 欄位不另外驗證目標存不存在。

`$子表_欄位key` 是「一」的那一方**不存清單**這條慣例的另一半：Sheet 上真相只有子表的 ref 欄位一份，父列上的陣列是讀的時候從它算出來的，所以新增／刪除子列不用維護任何東西。名字是「子表代稱＿ref 欄位 key」（`$child_parent`），零設定、看 schema 就推得出來；帶上欄位是為了同一張子表兩個 ref 欄位指向同一張父表（平行邊）時兩條邊各有各的名字，而且之後加第二個 ref 不會改到第一個的名字。代價是載一張表就會把它的父表與子表都載進來——這個 App 的規模無所謂，而且要顯示關聯資料本來就得整張載。

**連帶刪除**是可選的，開在 ref 欄位上：`{ type: 'ref', refTable: '父表', onDelete: 'cascade' }`。父列被刪時 `store.removeMany` 順著 `relations.ts` 找標了 cascade 的子表，把 ref 落在被刪 id 裡的子列也 `removeMany`，多層遞迴；走的是同一條 `patch`＋`enqueue`，所以佇列合併、流程存檔點與回滾都自動涵蓋，後端不用知道這件事。不標就維持原狀：子列留著、ref 指向不存在的 id（顯示退回 id）。子表要在快取裡才找得到子列，`ensureLoaded` 本來就會把子表一起載；沒載就刪的話 `removeMany` 在動任何東西之前先拋錯。範圍只到「刪除當下」，Sheet 手動改出來的孤兒不管。

🔲 `allowCreate`（清單裡直接「＋ 新增」對方一筆、回來自動選上）還沒做，卡在表單頁當流程呼叫端的幾個問題，見 ROADMAP。

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
    shell/                    整頁外殼與蓋在頁面上的東西
      AppShell.vue              頂部 AppBar + 導覽外殼；標題來自 route.meta.title，
                                右側動作按鈕來自 useAppBarActions()
      PageFab.vue               右下角浮動按鈕
      FilterDrawer.vue          右側篩選抽屜，欄位來自 schema 裡 searchable 的 select/number/date
      TabView.vue               頁籤 + 內容區，切換時依頁籤順序左右滑動
    dialog/
      AppDialog.vue             對話框外殼
      ConfirmDialog.vue         是/否確認框，建立在 AppDialog 上
      FieldsDialog.vue          「問幾個欄位」對話框，內容是只顯示幾欄的 DataForm
    list/                     多筆的呈現
      DataList.vue              卡片式列表的單列（含長按多選）
      ListField.vue             DataList 內部的兩列四角排版
      GroupedList.vue           多層可收合分組
      DataTable.vue             表格式列表；detail 頁內嵌的關聯子表格也用同一個
    record/                   單筆的顯示與編輯
      DataDetail.vue            整頁 detail 欄位區，自帶 loading/error/找不到資料三種狀態
      DetailField.vue           單一欄位顯示，可帶一個動作（整格可點）
      DataForm.vue              表單版的 DataDetail，依 column.type 自動選輸入元件
      RecordNav.vue             detail 頁左右兩側的上/下一筆箭頭
  composables/
    data/                     讀資料
      useTableList.ts           整表讀取（走共用快取）
      useSortedTableList.ts     上者 + schema.defaultSort 排序；列表頁預設用這個
      useTableRow.ts            單筆讀取
      useSearch.ts              useSearch(query, rows, schema)：依 searchable 的 text/ref 欄位比對文字
      useFilter.ts              useFilter(filters, rows, schema)：依 searchable 的 select/number/date 欄位篩選
    form/                     表單頁
      useTableForm.ts           useCreateForm / useEditForm，新增與編輯的共用邏輯
      useLeaveGuard.ts          表單登記 dirty getter；router.beforeEach 離開前先問（見 4.4）
      useSyncHold.ts            這個頁面活著的期間不准同步（表單 composable 內部用）
    shell/                    跟 AppShell 溝通、或由它提供的東西
      useActionSlot.ts          把動作註冊到 AppShell 某一塊的共用機制（含 KeepAlive 防護）
      useAppBarActions.ts       註冊到 App Bar 右側
      useAppBarSearch.ts        登記頁面的搜尋 query，App Bar 才出現放大鏡（見八）
      useBottomActions.ts       註冊到螢幕最底端，暫時取代導覽列（表單頁用）
      useOverlay.ts             overlayOpenKey：有東西蓋整頁（篩選抽屜）時通知 PageFab 讓開
      useActionRunner.ts        動作的執行（confirm 先問、錯誤進 snackbar），由 AppShell 提供
      useNotify.ts              全 App 一則 snackbar 訊息（module-level，任何地方都能叫）
      useConfirm.ts             confirm()：是／否對話框，回傳 promise
      useAskFields.ts           askFields()：開對話框只問幾個欄位，回傳 promise（見 4.4）
    navigation/               路由與頁面之間的接力
      useRouteId.ts             [id] 頁面取路由參數（見 4.3）
      useListOrder.ts           列表頁發布顯示順序、detail 頁取上/下一筆
      useFlow.ts                連續動作：runFlow / runStep / resumeStep（見 4.4）
    list/                     列表互動
      useMultiSelect.ts         多選狀態
      useLongPress.ts           長按偵測
    actions/
      useTableActions.ts        PageAction 型別 + 通用動作 builder
                                （useNewAction/useEditAction/useDeleteAction/useBulkDeleteAction/useQuickEditAction
                                 + 欄位動作 useGoToRefAction/useOpenUrlAction/useSetFieldAction）
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
    validation.ts             依 schema 的約束檢查一整列（唯一的合法性驗證來源）
    relations.ts              掃 schema 的 ref 欄位自動算出的關聯圖
    index.ts                  代稱 → Schema 對照表，匯出 TableKey
  config/navigation.ts        導覽項目設定
  router/index.ts             路由實例 + 轉場方向判定、leaveAfterAction / pushWithDefaults（見 4.4、八）
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
頁面 → useTableList/useSortedTableList/useTableRow
     → stores/tables.ts（有快取就直接給，沒有才抓）
     → services/appScript.ts fetchTable
     → 後端回原始字串 → coerceRow 依 schema 轉型別 → 存進快取
```

型別轉換只發生在 `fetchTable` 這一個點：後端形狀是 `Record<string, string>`，前端形狀是轉好型別的 Row（`Date`／`number`／`null`）。

**寫入**：一律走 store 的四個 action，**不要在頁面或元件裡直接呼叫 `mutateTable`**。

```ts
store.create(table, values)      // 回傳新建那筆（id 當場發），並 push 進快取
store.update(table, id, values)  // 回傳更新後那筆；values 可以只給幾欄，合併進快取裡的那筆
store.remove(table, id)          // 從快取移除
store.removeMany(table, ids)     // 從快取移除多筆
```

**這四個都是同步的**——它們只動快取與待寫入佇列，不碰網路。真正送出去是 `flush()` 的事，由使用者按 App Bar 上的推送鈕觸發。

- `rows` 是**畫面**的單一真相。已送出的與還沒送出的混在一起，畫面不需要分辨一筆送出去了沒
- `pending` 是**要送什麼**的單一真相。定位鍵是 (表, id)，`values` 在進佇列的當下就用 `serializeRow` 轉成要送出去的形狀（sheet 表頭當 key、值是字串），`flush` 拿了就送
- 同一筆的多次操作在**寫入當下**就合併掉，不是留到 flush 才算：`update` + `update` 併成一次、`create` + `update` 併進那個 `create`、`create` + `delete` 整組移除（根本不用送）、`update` + `delete` 只留 `delete`
- 表單一律送整列（不做最小差集），所以 `update` 的 `values` 就是整列——payload 大一點，但省掉在表單裡比對原始值的複雜度

`values` 在進佇列時就序列化，不存 `Partial<Row>`，有兩個理由：那本來就是要送給後端的形狀，flush 拿了就送；而且裡面沒有 `Date` 物件，哪天要存 `localStorage` 時 `JSON.stringify` 直接可用，不必回頭改資料結構。

三個結構各管一件事：

| | 存什麼 | 誰讀 |
| --- | --- | --- |
| `rows` | 畫面看到的資料。已送出的、沒送出的、流程建的全混在一起，刻意不分——畫面不該關心一筆送出去了沒 | 畫面 |
| `pending` | 還沒寫到後端的那批 | flush |
| `activeFlow` | 流程碰過的每張表**在被碰之前**的樣子 | 回滾 |

**推送**：`flush()` 逐筆送出佇列，成功一筆就移掉一筆。**失敗不還原**——已經送出的就是送出了，剩下的留在佇列裡等使用者再按一次；因為 id 由前端發，重送本來就是安全的，所以刻意**不做**「哪幾筆成功了」的補償邏輯。`flush()` 不往外拋，錯誤記在 `store.flushError`，回傳佇列是不是清空了。

因為 store 自己會把快取補好，呼叫端**不需要**手動 refresh——所以**沒有「只重抓一張表」的 API**，頁面沒有需要自己補資料的時機。要重抓就是整個 App 一起，也就是下面那顆同步鈕。跨表算出來的值（例如父表顯示子表的加總）因為讀的是同一份共用資料，會自動跟著重算，不需要任何跨表失效機制。

**同步鈕**固定放在 App Bar 最右側，做的是 `store.refresh()`＝**先推送再重抓所有已載入的表**（推不出去就不重抓，否則會無聲蓋掉未推送的變更）。因為它同時也是重新整理，所以平常永遠可按；`store.hasPending` 為真時才在圖示右下角加一個圓點，未推送是 `warning` 色、上次推送失敗轉 `error` 色。

它是 App 層級的東西、跟在哪一頁無關，所以**不走 `useAppBarActions`**——那條管道是給頁面註冊動作的，混進去會把頁面動作擠進 ⋮ 選單。同理，有未推送變更時 `beforeunload` 會攔一下關閉／重整，因為佇列只在記憶體裡。

**表單開著的時候同步鈕停用**（`store.canSync`）。`useCreateForm`／`useEditForm` 內部呼叫 `useSyncHold`，頁面活著的期間持有一個 `holdSync()`，離開時釋放——改到一半按同步，重抓會讓編輯頁的 `watch(row)` 把表單沖掉。持有是計數器，同時開幾張都對。

**流程存檔點**：`store.beginFlow()` 開一個存檔點，之後每張被碰到的表在改動前留一份原值（快取的陣列＋佇列的 Map，同一張表只留第一次）；`rollbackFlow()` 一次還原、`commitFlow()` 丟掉。給連續動作用的（見 4.4）——中途取消要整條流程一起取消，但不能動到跟流程無關的待推送變更。例：佇列已有 A、B、C，流程建了 P 又改了 B，取消後佇列回到 A、B、C（B 是流程碰之前的值，不是被刪掉），P 兩邊都消失、從頭到尾沒送出過。

存**整張表**而不是逐筆，因為流程進行中沒有別的寫入者：使用者正在填表單，而 `flush()` 在流程進行中會被擋下（否則按了同步就會把半成品推進 Sheet，之後想回滾也回滾不了——存檔點只動得了記憶體）。所以整張還原跟逐筆還原等價，但簡單很多——`patch` 本來就是整個陣列換掉，佇列的 `PendingOp` 也一律建新物件不就地改，淺層複製就夠。

存檔點是**隱式**的：流程期間的寫入不是連接器做的，是表單頁做的，`useCreateForm` 跟連接器隔著一次導覽、是不同的元件，拿不到顯式傳下去的 tx（函式塞不進 `history.state`）。所以 `activeFlow` 是 store 裡的環境狀態，`store.create/update` 自己去看。

**佇列不持久化**（決定不做）：重整／當機／分頁被系統殺掉就會丟掉未推送的變更，`beforeunload` 只擋得住主動關分頁。單人使用、推送就是一顆鈕，可接受；哪天要做的話怎麼做記在 [ROADMAP](ROADMAP.md) 累積寫入段。

**新增的 id 由前端發**（`store.create` 呼叫 `schema.newId()`），不等後端回傳。**怎麼發是每張表自己的事**——`newId` 是 schema 上的必填函式，框架不持有任何 id 格式的政策，只提供現成的 `prefixedId('TPL')`（前綴 + 8 碼十六進位隨機值，例如 `TPL-11eef1a8`）給常見情況用；要日期編號、流水號之類的就自己寫一個 `() => string` 塞進去。這讓重送變成安全的：`create` 的語意是「id 不存在就建、已存在就當作已完成」，所以整批重送不需要記錄哪幾筆成功過。後端仍然要擋重複 id——Sheet 可以手動打開來改，不能假設 id 只從這裡來。累積寫入的佇列要在送出前就知道 id，這也是它的前置條件。

一般頁面連這四個 action 都用不到——新增/編輯用 `useCreateForm`／`useEditForm`，刪除用 `useDeleteAction`／`useBulkDeleteAction`，內部都接好了。

### 4.3 KeepAlive 與路由參數

列表頁與 detail 頁都被 `<KeepAlive :max="50">` 快取，key 是 `route.fullPath`。

**key 一定要帶完整網址**，否則同一個路由換 id（`/表名/A` → `/表名/B`）對 Vue 而言是同一個元件、同一個 vnode，會就地更新而不觸發 `<transition>`，翻上/下一筆就完全沒有動畫。代價是 KeepAlive 從「每個元件一份」變成「每個網址一份」，所以要配 `max` 收斂；連續翻超過 50 筆不回列表的話，列表頁會被擠掉、展開與捲動狀態就沒了。

**離開中的頁面是全速運轉的。** KeepAlive 的 `deactivate` 只搬 DOM，不會暫停元件的 effect；而 `onDeactivated` 是 post-render，比 pre-flush 的 `watch` 還晚。所以在整段離場動畫期間，舊頁面仍然會對外部變化重新計算、重新渲染——而外面的世界已經換頁了。這是「返回時閃一下錯誤內容」這一整類問題的唯一根源。

只有兩種東西會流進離開中的頁面，各自的處理方式不同：

- **路由參數 → 讀一次就固定。** key 帶了完整網址，所以一個實例終其一生只對應一個 URL，路由參數對它而言是常數。`[id]` 頁面一律用 `useRouteId()`，它就是「setup 讀一次」，**不要**自己去 `watch` `route.params.id`：跟著路由走的話，離開中的頁面會拿到目的地的 id——目的地沒有 id 就變 `undefined` 閃「找不到這筆資料」，是別張表的 id 就查不到、同樣閃，是同一張表的另一個 id（上/下一筆）就直接渲染成新那筆，讓離場動畫看起來像內容自我複製。這條規則依賴上面的 `:key`，拿掉的話 `useRouteId()` 會在開發模式印出警告。
- **共用快取 → 讓它變。** 資料真的被刪掉時，離開中的頁面顯示「找不到這筆資料」是**正確**的，沒有為它加凍結機制（見 ROADMAP 的權宜作法）。`useEditForm` 在 `row` 變 null 時清空表單也是同一個道理。

**同一個網址共用同一份實例，所以再次進場時 `setup` 不會重跑。** 任何「每次進場都該重算」的東西要放進 `onActivated`。兩種表單都受影響：

- 新增頁的網址固定（`/表名/new` 不管從哪裡進去都一樣），所以 KeepAlive 只會有一份實例。不在 `onActivated` 重建初始值的話，表單會停在上一次的內容，導覽帶來的預設值也只讀得到第一次那份
- 編輯頁的網址帶 id，但「離開再回到同一筆」還是同一份實例。不重置的話，上次沒存就離開的輸入會原封留著，使用者很可能沒注意就按了儲存

兩者都在 `onActivated` 重建表單並清掉錯誤狀態。

掛在頁面之外的浮動 UI（`PageFab`、`RecordNav` 用 Teleport 送到 `body`）不受上面兩條管，要自己用 `onActivated`/`onDeactivated` 決定顯示與否，否則離開的頁面會把按鈕留在畫面上。

還有一點跟資料無關但同屬 KeepAlive：**列表載入中不要用 `v-if` 把列表整個換掉**。`v-if="loading"` / `v-else` 會在每次背景重新整理時卸載重建，`GroupedList` 的展開狀態就沒了。改用 `v-progress-linear v-if="loading"` 搭配獨立的 `v-if="!error"`，讓列表持續掛著。

### 4.4 完成動作後的導覽

新增/編輯/刪除完成後要離開頁面，用 `@/router` 的 `leaveAfterAction(fallback)`，**不要用 `router.push`**。`push` 會把已經完成任務的表單頁留在歷史裡，按上一頁又回到它（編輯頁是舊表單，刪除後的 detail 更是已經不存在的資料）。`leaveAfterAction` 走瀏覽器返回，沒有 App 內上一頁（例如直接貼網址進來）時才 `replace` 到 fallback。

**連續動作（流程）**：好幾個步驟要一氣呵成時——新增父表那筆後直接進它的 detail、或接著新增子表那筆——用 `@/composables/navigation/useFlow` 把它們串成一段 async 程式碼，包在 `runFlow` 裡：

```ts
onClick: () => runFlow(async () => {
  const row = await runStep<ParentRow>('/parent/new', { status: '已下單' })
  router.replace(`/parent/${row.id}`)
})
```

- `runStep(to, defaults?)` 用 `replace` 開一張表單、等它送出成功、拿回建好或改好的那筆。`defaults` 走 `history.state`，跟 `useNewAction` 同一條通道，所以只能放普通值（不能 reactive、不能函式）
- 表單送出成功後會先問 `resumeStep()`：有步驟在等就交棒、頁面不離開；沒有就照舊 `leaveAfterAction`。這是 `useCreateForm`／`useEditForm` 裡唯一為流程多出的分岔，通用動作一行都沒改
- **離開前先問**由 `useLeaveGuard` 的 `router.beforeEach` 統一處理——返回鍵、導覽列、改網址、表單底部的取消全走同一條，取消鈕自己不問（否則會問兩次）。要不要問看兩件事：流程第二步之後**一律問**（`useFlow` 的 `hasEarlierSteps`），文案是「是否放棄未儲存的變更（包含之前的變更）？」——這張表單本身可能一個字都還沒填，但前面的步驟已經寫了東西，離開等於整條收回；不在流程裡就看表單有沒有改動（`useCreateForm`／`useEditForm` 登記的 `dirty` getter）。說不就回傳 `false` 擋下導覽，頁面原地不動；瀏覽器返回鍵被擋下時 vue-router 會自己把歷史位置撥回來
- **任何導覽都算放棄**——守衛放行之後，`router.afterEach` 會 reject 等待中的步驟，`runFlow` 接到 `FlowCancelled` 就 `rollbackFlow()`，整條流程的快取與佇列改動一次還原。`runStep` 自己的導覽不會誤觸：它是等 `replace` 完成（`afterEach` 之後）才登記的；送出成功後的離開也不會被問——`resumeStep` 已經清掉等待中的步驟，表單自己也標成已送出
- 連接器自己拋錯（不是取消）也會 rollback，另外用 snackbar 報錯並 `leaveAfterAction('/')` 把人帶離——那一步的表單多半已經送出了，留在上面會讓人以為失敗而重按
- 流程進行中 `flush()` 拒絕執行（同步鈕本來就因為表單開著而停用，見 4.2）：半成品一旦推進 Sheet 就回滾不了了
- 「完成後去哪」就是連接器的最後一行 `router.replace(...)`。**第一步 `push`、之後每一步 `replace`**：push 是為了保住發起流程的那一頁，replace 是讓做完的表單不留在歷史裡。結果是歷史永遠只有「起點 → 目前這一步」兩筆，任何一步按返回或取消都回到起點，流程結束後也能從終點返回起點。（全部 replace 的話起點會被第一步吃掉，取消變成無處可去。）
- 流程跟其他動作一樣是 `PageAction`，**掛在起點那張表的 `use表名Actions` 底下**，跨表也一樣——呼叫端就是那個頁面，「頁面只從一個地方取動作」要成立，歸屬規則必須明確，「起點」是唯一不含糊的

流程裡的步驟有三種，只有第一種需要上面那套機制：

| 種類 | 例子 | 需要什麼 |
| --- | --- | --- |
| 導覽型 | 開新增／編輯表單 | `runStep`：`history.state` 把預設值送過去、module 變數把結果送回來 |
| 對話框型 | 選日期的小視窗 | `askFields`：一個普通的 promise，按確定時 resolve、取消是 `null` |
| 立即型 | 日期改成今天 | 什麼都不用，就是一次 `store.update` |

這也是不採用「把整條鏈序列化成資料」那個方案的原因：序列化的鏈表達不了後兩種步驟，也沒辦法在中途做判斷。而序列化唯一的好處「重整後流程還在」是刻意不要的——任何導覽都算放棄，重整更是。

**「問幾個欄位」對話框**（`useAskFields.ts`）：`askFields<Row>(schema, keys, options?)` 回傳 `Promise<Partial<Row> | null>`，給只想改一兩欄、不值得開整頁表單的動作用（改狀態、補日期、批次快速編輯）。它獨立於流程，直接在 `onClick` 裡 `await` 就好；在流程裡當一步用也行。

- 內容就是 `DataForm` 加 `only` prop 只顯示 `keys` 那幾欄：輸入元件、驗證、錯誤顯示全部沿用，不另做一套。驗證只跑被問到的欄位（`validateRow` 的 `keys` 參數），不然沒問到的必填欄位會被算成錯
- 初始值三層：`options.rows` 剛好一筆且那欄非空 → 現值；否則 `options.defaults[key]`（值或函式，同 schema 的 `ColumnDefault`）；都沒有 → 空。**不套 schema 的 `default`**——那是新增表單的初始值，改現有資料時不該冒出來。多筆時不顯示現值：那是「填一次、全部改成同一個值」的用法，各筆本來就不一樣
- 通用的用法包成 `useQuickEditAction(table, keys, selectedIds, { label, icon, defaults, onDone })`：多選模式下出現，選取的 id 查快取拿 rows 交給 `askFields`，確定後對每個 id 各跑一次 `store.update`（不另開 op 種類，佇列的合併規則直接適用）
- 跟 `notify` 同一個模式：module-level 狀態 + `AppShell` 掛一個 `FieldsDialog`，promise 由確定／取消 resolve，整個 App 只有一個實例。再叫一次會先把上一個當作取消。是／否的 `confirm(title, text): Promise<boolean>`（`useConfirm.ts`）是同一個模式的最簡版本，動作的 `confirm` 宣告與離開守衛都用它
- `router.afterEach` 把開著的對話框關掉並 resolve `null`——掛在 `AppShell` 上的對話框會跨路由存活，不關的話換頁後它還開著
- 一次問幾個欄位就放在同一個對話框。連續動作是給「一步的結果決定下一步」用的，欄位之間沒有相依，拆開只是多按幾次確定

**流程不能套疊。** 存檔點只有一格，第二個 `beginFlow` 會直接拋錯（外層的存檔點完好，內層那個動作被 runner 接住報錯）。從 UI 上套不進去——流程中途使用者只會在表單頁上，能按的只有那一步自己的取消／送出——會發生只有一種情況：連接器在兩步之間跑去非表單的頁面。所以連接器只有兩條規則：**只用 `runStep` 導覽到表單；結尾一定要有一個離開的導覽。**

### 4.5 Schema 的角色

- 前端讀取時的型別轉換依據
- 共用欄位元件的設定來源（顯示順序、輸入元件選擇、select 的選項、ref 的目標表）
- 後端泛用 CRUD 引擎的依據
- **不用來自動產生整個頁面**——版面與內容由開發者決定

前後端各自維護一份 Schema，不共用程式碼。欄位改動期間先接受手動同步，之後真的常對不起來再考慮做產生器。

**驗證的分工**：**合法性驗證只在前端做**——required、數值範圍、`select` 的選項這些，全部從 schema 推導出同一份驗證函式（`schema/validation.ts` 的 `validateRow`），用在兩個地方：form 層即時逐欄提示（給使用者看），以及 store 的寫入 action 再擋一次（給程式看，因為所有寫入只能走 store，那是唯一的窄口）。後端只做安全性與**結構完整性**檢查：id 不重複、`update`／`delete` 的目標存在、表名與欄位名都在 schema 內。最後一項不能省——打錯的欄位名會直接在 Sheet 上長出一欄新表頭或寫錯格。反正 Sheet 本來就能手動打開來亂改，後端擋合法性也擋不完整，不如把那份責任明確劃給前端。

**form 層**：約束寫在欄位上（`required`，以及 number 專用的 `min`／`max`），`useTableForm` 在送出前呼叫 `validateRow`，不通過就不送、把 `fieldErrors` 交給 `DataForm` 逐欄顯示。**第一次按送出之前不提示**，免得使用者才剛打開表單就滿江紅；按過一次之後改成即時更新，錯誤在改好的當下就消失。`askFields` 同一套，只驗問到的欄位。

**store 層**：`create`／`update` 在碰快取與佇列之前先跑同一個 `validateRow`，有錯就把各欄訊息串成一句拋出去、什麼都不動。`update` 的 `values` 可以只給幾欄，所以只驗給了的那幾欄。這層擋到的是繞過表單的程式 bug（例如 `useSetFieldAction` 塞了不合法的值），錯誤經 `useActionRunner` 進 snackbar；不另做逐欄的錯誤型別，逐欄顯示是 form 層的事。

型別層面的限制不靠驗證函式，而是靠輸入元件本身：number 用 `v-number-input`（連 `min`／`max` 一起傳下去）、date 用 `v-date-input`、select 用 `v-select` 只能選 `options`。驗證函式擋的是元件擋不住的那些（沒填、超出範圍）。select 加 `allowCustom: true` 就變 `v-combobox`：`options` 只是建議清單、打別的字也收，驗證跟著跳過選項檢查——資料形狀還是一個字串，顯示與篩選都不用知道差別（篩選抽屜本來就列資料裡出現過的值）。再開 `suggestFromData` 建議清單會接上這張表資料裡用過、`options` 沒有的值：`options` 照原順序在前，多出來的依出現次數再依字串，跟篩選抽屜共用 `presentValues` 所以排法一致。`DataForm` 只拿到 schema，靠 `schemas` 反查自己是哪張表來讀共用快取（schema 物件是單例），呼叫端不用多傳；沒開的欄位不會多載任何東西。兩個開關分開是因為「清單自己長」不一定是好事——打錯過的值也會變成建議，清單只會長不會收。

**內建的約束只有 `required`／`min`／`max`／`select` 選項**，其他規則（日期先後、文字格式、跨欄位比較）不逐一加進框架，而是欄位上一個 `validate: (value, row) => 錯誤訊息 | null` 讓設計者自己寫。內建檢查過了、而且有值時才叫——空值是 `required` 的事，設計者不用每條規則都先判 null；代價是「某條件下才必填」寫不了。`value` 的型別跟 `type` 走、`row` 是 `TableSchema<Row>` 的那個 Row，跨欄位規則直接讀。一欄一個函式，多條規則自己在裡面串。store 層的 `update` 只給了幾欄時，會拿快取裡那筆合併後再驗，所以 `row` 永遠是整列。

`schema/index.ts` 另外帶「代稱 → 實際 Sheet 分頁名稱」的對照：程式碼裡好打的英文代稱（例如 `'order'`）不等於 Sheet 分頁的實際名稱（可能是中文）。打 API 時用的是 schema 裡的 `sheetName`，兩者故意分開——換代稱不影響 API，換分頁名稱也不用到處改字串。

**虛擬欄位**（`virtualColumns`）：不存在 Sheet 上、讀的時候才算出來的欄位。來源可以是這一列自己（價格加手續費），也可以是子表（父表用「底下第一筆子資料的名字」當標題、子表金額的加總）。跟 `columns` 分開放，所以 `coerceRow`／`serializeRow`／`columnValues`／表單全部不用知道它——它們只認 `columns`，這就是「虛擬欄位除了不能編輯，其他都跟真實欄位一樣」的由來。

它跟真實欄位共用同一套型別骨架：`ColumnTypes` 那張表定義每種 `type` 的值型別與專屬設定（`number` 的 `min`／`max`、`ref` 的 `refTable`……），`ColumnBase<T>` 是一個欄位最基本的資訊（`key`、`label`、`type` 加專屬設定），`SchemaColumn` 在上面疊 Sheet／表單相關的設定，`VirtualColumn` 疊 `value`。以後加一種型別只改 `ColumnTypes`、`coerceValue`、`formatColumnValue`、`DataForm` 四處，兩種欄位自動都有。

**schema 對著 Row 介面檢查**：各表宣告成 `TableSchema<XxxRow>`，欄位 `key`、`labelColumn`、`detailOrder`、`defaultSort` 就只能填 Row 有的欄位名，而且 `type` 要跟 Row 那個欄位的值型別對得上（`type: 'number'` 只能綁 `number | null` 的欄位）；虛擬欄位 `value` 拿到的 `row` 也直接是 `XxxRow`，不用轉型。Row 介面仍然是手寫的（`readonly total`、`readonly $parent?: ParentRow` 這些 store 會掛、TS 不知道的欄位要自己補），泛型只做單向檢查，不會反過來從 schema 產生介面——那需要兩段式 builder 加跨表的延遲查表，讀起來不再是一眼看完的物件字面值，不值得。框架端一律用不帶參數的 `TableSchema` 接，它的 Row 預設是 `any`（key 退化成 `string`、`row` 退化成 `any`）：不用 `object` 是因為 `keyof Row` 讓 TS 把 `Row` 判成逆變，`TableSchema<XxxRow>` 會塞不進 `TableSchema<object>`。

**值是 store 掛在 row 上的 getter**（`attachGetters`，在 `load`／`create`／`update` 產生 row 物件時掛；同一個函式也掛 `$label`——這一列的名字，`TableSchema.labelColumn` 指定用哪一欄，省略就是 id，Row 介面 extends `RowBase` 就有它的型別——和 ref 的 `$欄位key`，見第三章）。所以 `row.title` 讀起來跟真實欄位一模一樣，`sortRows`、`groupRows`、`formatColumnValue`、列表頁的 `row.xxx` 全部不用知道它是算的；`defaultSort` 可以指它。getter 裡讀的是 `store.rows`，在 template 或 `computed` 裡讀就會被追蹤，子表一改當場重算。getter 設成不可列舉，`{ ...row }`、`Object.keys`、JSON 都看不到它，寫入端不會誤送。跨表的值直接讀 store 掛好的 `row.$欄位key`（父列）與 `row.$子表_欄位key`（子列陣列），`ensureLoaded` 會把它們一起載；子表還沒載時陣列是空的、載進來後自動重算。

**新增表單的初始值**分三層疊出來，後面的蓋前面的：schema 欄位的 `default`（跟來源無關的固定值）→ 導覽帶來的 `history.state.defaults`（從哪裡按新增決定）→ `useCreateForm` 的第三個參數（頁面自己算得出來的）。`default` 可以是值也可以是函式，函式在打開表單那一刻才求值（例如 `() => new Date()`）。

第二層是給「同一個新增頁、不同來源要不同預設值」用的：`useNewAction(table, defaults)` 的 `defaults` 收 getter，點下去的當下才求值。

**`PageAction` 因此只有 `onClick`，沒有宣告式的 `to`。** 原因是求值時機——action 物件在頁面 setup 時就建好，寫進 `to` 的值那時定型，切了頁籤再按新增會帶到舊的狀態。（`to` 本身其實可以帶 `state`，`RouterLink` 會把整個 `to` 丟給 `router.push`，問題只在求值時機。）統一成一種也免得兩個都設時變成「導覽 + 執行 onClick」兩件事一起發生。代價是動作按鈕渲染成 `<button>` 而非 `<a>`，失去中鍵開新分頁與連結的無障礙語意；這個 App 的動作都在 FAB 與 App Bar 上，用不太到。

選 `history.state` 而不是 query param 是為了不讓值出現在網址上；它比全域變數好的地方是**值綁在那一筆歷史紀錄上**，不會殘留下來汙染之後不相關的表單。

> 注意：函式型的 `default` 只存在於前端。README 4.5 的前提是前後端各自維護一份 schema，靜態預設值兩邊可以對照著寫，函式沒辦法——這跟「合法性驗證只在前端做」是同一條線，預設值屬於使用者輸入前的建議，是前端的職責。

`SchemaColumn.type` 有 `text`／`number`／`date`／`ref`／`select`。用 discriminated union 寫，讓「標了 `type: 'ref'` 卻忘記填 `refTable`」在編譯期就報錯。`refTable` 目前只存代稱字串，沒有型別檢查它是否真的存在於 `schemas`——這是為了避免 `schema/types.ts` 反過來 import `schema/index.ts` 造成循環依賴，先接受這個小缺口。

### 4.6 頁面範本的四種型態

不管套到哪張表都是同一套範本，差別只在開了哪些功能。實際檔案見 `vue-build/template/`。

- **列表**：卡片式（適合瀏覽）或表格式（適合比對、多選）。排序依 `schema.defaultSort`。可選功能：分組、Tabs 篩選、多選、搜尋與篩選（`useSearch`／`useFilter` + `useAppBarSearch`，見八）
- **詳細**：顯示單筆所有欄位（含 schema 的虛擬欄位），順序依 `schema.detailOrder`。可選功能：內嵌關聯子表格、編輯/刪除入口
- **表單**：依欄位型別自動選輸入元件，順序依 `schema.formOrder`。新增與編輯共用同一套版面
- **總覽**：彙整多筆/跨表的聚合數字。目前沒有具體需求，保留位置

`detailOrder` 跟 `formOrder` 故意分開，因為兩邊需求不一定相同。

### 4.7 後端客製邏輯擴充點（Hooks）

> 🔲 **尚未實作。** 這是後端的擴充點，而後端整個還沒開始寫；前端 `TableSchema` 也還沒有 `hooks` 欄位。這裡只記設計方向。前端算得出來、不用寫回 Sheet 的欄位已經有 `virtualColumns`（4.5），hooks 是給「要落到 Sheet 上」的邏輯用的。

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
- action：`create`、`update`、`delete`（假後端另有 `bulkUpdate`，但前端的佇列一律逐筆送，快速編輯與批次刪除都拆成多個單筆操作，目前沒有人叫它）。完整介面與之後的 batch 端點見 ROADMAP「後端 API 介面」
- payload 裡的欄位值**由前端轉成 sheet 的形狀**（表頭當 key、值是字串）再送出，後端拿到什麼就寫什麼，不自己做型別轉換
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

**驗證**：分工見 4.5——合法性只在前端做（form 層與 store 寫入層都接了同一個 `validateRow`），後端只做安全性與結構完整性。目的不是防外部攻擊（那已經靠 Google 帳號擋掉了），而是防自己送出壞資料。

🔲 **多裝置同時編輯**（還沒做，也沒有 `updatedAt` 欄位）：做樂觀鎖定。每筆資料帶系統維護的 `updatedAt`，讀取時帶回、編輯送出時附上讀取當下的值，後端比對不一致就回錯誤讓前端提示「已被修改，請重新整理」，而不是直接覆蓋。

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
- **搜尋在 App Bar 上**：頁面 `useAppBarSearch(query)` 登記後才出現放大鏡，按下去整條 App Bar 換成「←＋輸入框」（淺灰藥丸形），標題與動作先讓位；← 關閉並清空 query。跟動作一樣走 `registerSlot`，換頁自動收起；回到還帶著 query 的頁面（KeepAlive）會自動重開，讓搜尋欄跟被過濾的列表一致。**query 是頁面的 ref，AppShell 只負責讓使用者打字進去**——過濾本身是頁面用 `useSearch(query, rows, schema)` 做的：只比 `searchable: true` 的 `text`／`ref` 欄位（真實與虛擬都行，ref 比的是父列的名字），每列的可搜尋文字只在 rows 變時重算、敲字只做 `includes`；query 依空白切詞、雙引號包起來的當一個詞，每個詞都要命中。全部小寫比對，不做全半形正規化。有頁籤的頁先搜再依頁籤切，所以一個 query 跨所有頁籤；多面板的頁把同一個 `query` 傳進每個面板各自過濾，不需要「哪個面板是當前」的訊號
- **篩選收在搜尋欄裡**：登記時多給 `{ schema, filters, rows }`，輸入框內最右側多一顆篩選鈕（有條件生效時主色），按下去從右側滑出抽屜（`FilterDrawer`），改了即時生效、沒有套用鈕；← 關閉搜尋時篩選一起清掉。抽屜開著時 `PageFab` 讓開——它的 z-index 本來就在 layout 之上，靠 `useOverlay` 的 `overlayOpenKey` 通知。`filters` 跟 `query` 一樣是頁面的 ref，過濾是頁面用 `useFilter(filters, rows, schema)` 做的，串法 `rows → useFilter → useSearch → 頁籤切`。篩選的對象是 `searchable: true` 的 `select`／`number`／`date`（`text`／`ref` 歸搜尋，兩邊用同一個開關）：select 是多選 chip、欄位間 AND、選項間 OR；number／date 是最小／最大（從／到）兩格，只填一邊就是單邊限制；設了範圍而值是空的列排除，select 多一顆「(空白)」勾了才留空值的列。抽屜欄位順序照 `detailOrder`；select 只列 `rows`（未過濾整表）裡出現過的值，資料變了選項跟著變；chip 用等寬 grid，一列幾顆由最長選項的估計寬度（全形 1em、其他 0.6em）決定，長選項多就自動變兩欄、一欄，不會有一列三顆一列兩顆的跳動
- **表單頁的按鈕放在螢幕最底端**，用 `useBottomActions()` 註冊，暫時取代底部導覽列，離開頁面自動還原。這樣「取消／送出」永遠在拇指構得到的地方，不用把長表單捲到最後才按得到；而表單本來就是「要按到才算完成」的頁面，此時不該讓人分心去切分頁
- FAB、App Bar、底部動作列共用同一種 `PageAction` 型別 `{ key, label, icon, onClick, confirm? }`。頁面自己決定用哪幾個、放哪裡。`icon` 一律要給——底部動作列雖然只顯示文字，但形狀統一，同一個動作搬到別的位置不用補東西
- 內建 builder（新增／編輯／刪除／批次刪除／ref 前往／開網址）的 `label` 與 `icon` 都有預設，各表要換就傳 `ActionLook`（`{ label?, icon? }`）覆寫；自訂的動作（快速編輯、改成某值）沒有預設，在各表的 `use表名Actions.ts` 裡宣告時自己給。框架的預設圖示集中在 `useTableActions.ts` 的 `actionIcons`，表單的取消／送出也從那裡拿
- **detail 頁的欄位也能掛一個動作**（`DataDetail` 的 `fieldActions`：欄位 key → `PageActions`，每欄只用第一個）：右邊出現圖示、整格可點，走同一個 `runAction`。ref 的「前往對方」不是內建的，跟開網址、改成今天一樣是 builder（`useGoToRefAction`／`useOpenUrlAction`／`useSetFieldAction`），要就列進去、不要就不列——沒有「空陣列代表內建」這種第三態。從 `use表名Actions({ row })` 拿，跟其他動作同一個家。ref 那格從 `<RouterLink>` 變成 `<button>`，中鍵開新分頁沒了，跟 `PageAction` 沒有 `to` 是同一個取捨；導覽用 `push`，回來時 detail 還在
- 三塊都走同一個 `registerActions`（`useActionSlot.ts`）。每一塊都是**單一 setter**，所以一定要靠 `isActive` 擋住被 KeepAlive 快取的頁面：它們仍然是全速運轉的（見 4.3），動作一變就會蓋掉當前頁面的
- **需要確認的動作只要宣告 `confirm: { title, text }`**，不用自己擺 `ConfirmDialog`。`AppShell` 用跟 `useAppBarActions` 同一套 provide/inject 提供 `runAction`，按鈕點下去交給它：有 `confirm` 就先 `await confirm()`（`useConfirm.ts`），說好才跑 `onClick`；`onClick` 拋錯一律進 snackbar。整個 App 只有一個確認框實例。宣告式的 `confirm` 只是語法糖——它對每個動作都一樣、動作本體不需要知道；`askFields` 沒有同樣的糖，因為它的結果是動作要拿去用的
- **所有 builder 都回傳 `ComputedRef<PageAction[]>`**（`PageActions`），沒有單數複數之分，呼叫端可以直接串接；沒有可用動作時就是空陣列，不需要 `undefined` 或 null 檢查
- 每張表的動作**一律從 `use表名Actions(options)` 取**，包含批次刪除。options 全是可選的，呼叫端只給自己有的東西（列表頁給 `selectedIds`/`onDone`，detail 頁給 `row`），用不到的動作就是空陣列——因為形狀統一，這裡不需要 `undefined` 或分支。每個呼叫端專屬的設定（例如新增表單的預設值）也放在這個 options 裡
- 頁面切換有前進/後退轉場動畫。方向由 `router/index.ts` 的 `afterEach` 分四層判定，先命中先算：**(1)** 兩端都是導覽項目 → 依導覽列排列順序（右邊的算前進）；**(2)** 只有目的地是導覽項目 → 一律後退，因為從內頁回到頂層就是往外；**(3)** 同一個路由換 id、而且兩筆都在列表發布的順序裡 → 依它們在列表中的先後；**(4)** 其他 → 看 `history.state.position` 是往前還是往後，也就是點連結/action 算前進、返回鍵算後退
- detail 頁的上/下一筆（`RecordNav` 的箭頭與 `v-touch` 手勢）走 `useSiblingNav`，順序來自列表頁用 `useListOrder` 發布的**畫面實際順序**（含篩選、頁籤、分組），頭尾不輪轉，切換用 `replace` 所以不會把每一筆都堆進歷史。第 (3) 層規則就是為它存在的——`replace` 不會改變 `history.state.position`，只靠第 (4) 層會一律判成前進
- 底部導覽列的按鈕用 `replace`，切分頁時覆蓋掉目前那筆歷史。內頁不會堆進歷史，連續切換也不會讓歷史一直變長；代價是站在導覽項目頁按瀏覽器返回不會回到上一個分頁
