# 前端架構

程式碼怎麼分、頁面之間怎麼接力：模組結構、KeepAlive 的規則、動作完成後的導覽與連續流程。

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
    shell/             AppShell、PageFab、FilterDrawer、TabView
    dialog/            AppDialog、ConfirmDialog、FieldsDialog
    list/              DataList、ListField、GroupedList、DataTable
    record/            DataDetail、DetailField、DataForm、RecordNav
  composables/
    data/              讀資料：useTableList、useSortedTableList、useTableRow、useSearch、useFilter
    form/              表單頁：useTableForm、useLeaveGuard、useSyncHold
    shell/             跟 AppShell 溝通：useActionSlot、useAppBarActions、useAppBarSearch、
                       useAppBarTabs、useBottomActions、useOverlay、useActionRunner、
                       useNotify、useConfirm、useAskFields
    navigation/        路由接力：useRouteId、useListOrder、useFlow
    list/              列表互動：useMultiSelect、useLongPress
    actions/           useTableActions：PageAction 型別 + 通用動作 builder
  stores/tables/       共用快取、待推送佇列、row 上的 getter（見 store.md）
  services/            appScript.ts 是對後端唯一的出入口；mock/ 是假後端，上線後整個刪掉
  schema/              每張表的欄位定義、驗證、關聯圖（見 schema.md）
  config/              app.ts（App 名稱）、navigation.ts（導覽列項目）
  router/index.ts      路由實例、轉場方向判定、leaveAfterAction / pushWithDefaults
  pages/               檔案即路由
```

頁面的檔名直接對應網址：

| 檔案 | 網址 |
| --- | --- |
| `pages/表名/index.vue` | `/表名` 列表 |
| `pages/表名/new.vue` | `/表名/new` 新增 |
| `pages/表名/[id]/index.vue` | `/表名/:id` 詳細 |
| `pages/表名/[id]/edit.vue` | `/表名/:id/edit` 編輯 |

> **注意**：同一個動態片段不能同時有 `[id].vue` 檔案和 `[id]/` 資料夾——unplugin-vue-router 會把前者當成後者的 parent layout，子路由要靠 `<router-view>` 才顯示。一律用資料夾寫法。

---

## KeepAlive 的規則

列表頁與 detail 頁都被 `<KeepAlive :max="50">` 快取，key 是 `route.fullPath`。由此而來的五條規則：

- **`[id]` 頁面一律用 `useRouteId()`**，不要自己 `watch` `route.params.id`。一個實例終其一生只對應一個網址，路由參數對它而言是常數；跟著路由走的話離開中的頁面會讀到目的地的 id（拿掉 `:key` 的話 `useRouteId()` 會在開發模式印警告）
- **快取變了就讓它變**。資料真的被刪掉時，離開中的頁面顯示「找不到這筆資料」是正確的
- **「每次進場都該重算」的東西放 `onActivated`**，因為同一個網址共用同一份實例、`setup` 不會重跑。兩種表單都在 `onActivated` 重建表單並清掉錯誤：新增頁的網址固定（不重建會停在上次的內容、也讀不到新的預設值），編輯頁「離開再回到同一筆」也是同一份實例（不重置的話上次沒存的輸入會留著，很容易被誤存）
- **Teleport 出去的浮動 UI 自己管進出場**（`PageFab`、`RecordNav` 送到 `body`），用 `onActivated`／`onDeactivated`，否則離開的頁面會把按鈕留在畫面上
- **列表載入中不要用 `v-if` 把列表整個換掉**。`v-if="loading"` / `v-else` 會在每次背景重新整理時卸載重建，`GroupedList` 的展開狀態就沒了。改用 `v-progress-linear v-if="loading"` 搭配獨立的 `v-if="!error"`

會有這些規則，是因為**離開中的頁面是全速運轉的**，理由見文末的設計取捨。

---

## 完成動作後的導覽

新增／編輯／刪除完成後要離開頁面，用 `@/router` 的 `leaveAfterAction(fallback)`，**不要用 `router.push`**：

```ts
leaveAfterAction('/表名')   // 走瀏覽器返回；沒有 App 內上一頁時才 replace 到 fallback
```

`push` 會把已經完成任務的表單頁留在歷史裡，按上一頁又回到它——編輯頁是舊表單，刪除後的 detail 更是已經不存在的資料。

---

## 連續動作（流程）

好幾個步驟要一氣呵成時（新增父表那筆後直接進它的 detail、或接著新增子表那筆），用 `useFlow` 串成一段 async 程式碼：

```ts
onClick: () => runFlow(async () => {
  const row = await runStep<ParentRow>('/parent/new', { status: '已下單' })
  router.replace(`/parent/${row.id}`)
})
```

- **`runStep(to, defaults?)`** 用 `replace` 開一張表單、等它送出成功、拿回建好或改好的那筆。`defaults` 走 `history.state`，跟 `useNewAction` 同一條通道，所以只能放普通值（不能 reactive、不能函式）
- **表單不用改**：送出成功後先問 `resumeStep()`，有步驟在等就交棒、頁面不離開；沒有就照舊 `leaveAfterAction`。這是 `useCreateForm`／`useEditForm` 裡唯一為流程多出的分岔
- **任何導覽都算放棄**：守衛放行後 `router.afterEach` 會 reject 等待中的步驟，`runFlow` 接到 `FlowCancelled` 就 `rollbackFlow()`，整條流程的快取與佇列改動一次還原
- **連接器拋錯**（不是取消）也會 rollback，另外用 snackbar 報錯並 `leaveAfterAction('/')` 把人帶離——那一步的表單多半已經送出，留在上面會讓人以為失敗而重按
- **流程進行中不能推送**：`flush()` 拒絕執行（同步鈕本來就因為表單開著而停用，見 [store.md](store.md)）
- **流程掛在起點那張表**的 `use表名Actions` 底下，跨表也一樣
- **流程不能套疊**：存檔點只有一格，第二個 `beginFlow` 直接拋錯

連接器只有兩條規則：**只用 `runStep` 導覽到表單；結尾一定要有一個離開的導覽。**

### 離開前先問

由 `useLeaveGuard` 的 `router.beforeEach` 統一處理——返回鍵、導覽列、改網址、表單底部的取消全走同一條（取消鈕自己不問，否則會問兩次）。要不要問看兩件事：

- **在流程第二步之後一律問**，文案是「是否放棄未儲存的變更（包含之前的變更）？」——這張表單可能一個字都還沒填，但前面的步驟已經寫了東西，離開等於整條收回
- **不在流程裡**就看表單有沒有改動（`useCreateForm`／`useEditForm` 登記的 `dirty` getter）

說不就回傳 `false` 擋下導覽，頁面原地不動；瀏覽器返回鍵被擋下時 vue-router 會自己把歷史位置撥回來。`runStep` 自己的導覽不會誤觸（它是等 `replace` 完成才登記的），送出成功後的離開也不會被問（`resumeStep` 已經清掉等待中的步驟）。

### 步驟的三種型態

只有第一種需要上面那套機制：

| 種類 | 例子 | 需要什麼 |
| --- | --- | --- |
| 導覽型 | 開新增／編輯表單 | `runStep`：`history.state` 送預設值過去、module 變數把結果送回來 |
| 對話框型 | 選日期的小視窗 | `askFields`：一個普通的 promise，確定時 resolve、取消是 `null` |
| 立即型 | 日期改成今天 | 什麼都不用，就是一次 `store.update` |

---

## 快速編輯對話框

只想改一兩欄、不值得開整頁表單時用（改狀態、補日期、多筆改成同一個值）。開一個對話框只問那幾欄，按確定才寫回去：

```ts
const values = await askFields<Row>(schema, ['status'], { rows: [current] })
if (values) {
  store.update(table, current.id, values)
}
```

- 回傳 `Promise<Partial<Row> | null>`，取消是 `null`。獨立於流程，也能在流程裡當一步用
- 內容就是 `DataForm` 加 `only` prop 只顯示那幾欄：輸入元件、驗證、錯誤顯示全部沿用。驗證只跑被問到的欄位，不然沒問到的必填欄位會被算成錯
- **初始值三層**：`options.rows` 剛好一筆且那欄非空 → 現值；否則 `options.defaults[key]`（值或函式）；都沒有 → 空。**不套 schema 的 `default`**——那是新增表單的初始值，改現有資料時不該冒出來。多筆時不顯示現值，那是「填一次、全部改成同一個值」的用法
- 通用的用法包成 `useQuickEditAction(table, keys, selectedIds, { label, icon, defaults, onDone })`：多選模式下出現，確定後對每個 id 各跑一次 `store.update`（不另開 op 種類，佇列的合併規則直接適用）
- 只是要問是／否就用 `confirm(title, text): Promise<boolean>`，動作的 `confirm` 宣告與離開守衛都用它
- 一次要問的欄位放在同一個對話框。連續動作是給「一步的結果決定下一步」用的，欄位之間沒有相依，拆開只是多按幾次確定

---

## 頁面範本的四種型態

不管套到哪張表都是同一套範本，差別只在開了哪些功能。實際檔案見 [template/](../template/)。

| 型態 | 範本 | 內容 | 可選功能 |
| --- | --- | --- | --- |
| **列表**（list） | `pages/list.vue` | 卡片式（適合瀏覽）或表格式（適合比對、多選），排序依 `defaultSort` | 分組、頁籤篩選、多選、搜尋與篩選（見 [ui.md](ui.md)） |
| **詳細**（detail） | `pages/detail.vue` | 單筆所有欄位（含虛擬欄位），順序依 `detailOrder` | 內嵌關聯子表格、編輯／刪除入口 |
| **表單**（form） | `pages/new.vue`、`pages/edit.vue` | 依欄位型別自動選輸入元件，順序依 `formOrder` | 新增與編輯共用同一套版面 |
| **總覽**（dashboard） | 🔲 還沒有 | 彙整多筆／跨表的聚合數字 | 目前沒有具體需求，保留位置 |

`detailOrder` 跟 `formOrder` 故意分開，因為兩邊需求不一定相同。

---

## 設計取捨

**為什麼 KeepAlive 的 key 要帶完整網址**
不帶的話，同一個路由換 id（`/表名/A` → `/表名/B`）對 Vue 而言是同一個元件、同一個 vnode，會就地更新而不觸發 `<transition>`，翻上／下一筆就完全沒有動畫。代價是 KeepAlive 從「每個元件一份」變成「每個網址一份」，所以要配 `max` 收斂；連續翻超過 50 筆不回列表的話，列表頁會被擠掉、展開與捲動狀態就沒了。

**為什麼離開中的頁面還在運轉**
KeepAlive 的 `deactivate` 只搬 DOM，不會暫停元件的 effect；而 `onDeactivated` 是 post-render，比 pre-flush 的 `watch` 還晚。所以在整段離場動畫期間，舊頁面仍然會對外部變化重新計算、重新渲染——而外面的世界已經換頁了。這是「返回時閃一下錯誤內容」這一整類問題的唯一根源，上面那五條規則都是為它而存在。流進離開中頁面的東西只有兩種：路由參數（讀一次就固定）與共用快取（讓它變）。

**為什麼流程的第一步 `push`、之後 `replace`**
push 是為了保住發起流程的那一頁，replace 是讓做完的表單不留在歷史裡。結果是歷史永遠只有「起點 → 目前這一步」兩筆：任何一步按返回或取消都回到起點，流程結束後也能從終點返回起點。全部用 replace 的話起點會被第一步吃掉，取消就無處可去。

**為什麼流程是 async 程式碼，不是序列化的步驟鏈**
序列化的鏈表達不了對話框型與立即型的步驟，也沒辦法在中途做判斷。而序列化唯一的好處是「重整後流程還在」，這在這套設計裡反而不是好處——任何導覽都算放棄，重整更是。

**為什麼流程不能套疊**
存檔點只有一格，內層的 `beginFlow` 會蓋掉外層。從 UI 上其實套不進去——流程中途使用者只會在表單頁上，能按的只有那一步自己的取消／送出——會發生只有一種情況：連接器在兩步之間跑去非表單的頁面。所以直接拋錯（外層的存檔點完好，內層那個動作被 runner 接住報錯）。

**為什麼流程掛在起點那張表**
頁面只從一個地方取動作（`use表名Actions`），歸屬規則必須明確，而「起點」是唯一不含糊的說法——跨表流程從哪張表發起就掛在哪張表。

**為什麼對話框是 module-level 的單一實例**
跟 `notify` 同一個模式：module-level 狀態 + `AppShell` 掛一個 `FieldsDialog`，promise 由確定／取消 resolve，整個 App 只有一個實例，再叫一次會先把上一個當作取消。`router.afterEach` 會把開著的對話框關掉並 resolve `null`——掛在 `AppShell` 上的對話框會跨路由存活，不關的話換頁後它還開著。
