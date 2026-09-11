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

### 跨表關聯
- `schema/relations.ts` 掃 schema 的 `ref` 欄位自動產生關聯圖，新增關聯只要標 `type: 'ref'`
- `DataDetail` 對 `ref` 欄位自動產生連到對方 detail 頁的連結
- `useRelatedRows(子表, 父表)` 依關聯圖解析外鍵欄位，整表撈一次後在前端分組

### 資料存取
- `stores/tables.ts`：每張表一份全 App 共用的快取，同一張表不會重複打 API
- `useTableList` / `useSortedTableList` / `useTableRow` / `useRelatedRows` 都讀同一份
- 寫入走 store 的 `create` / `update` / `remove` / `removeMany`：改快取並進佇列，呼叫端不用手動 refresh
- 待寫入佇列 `pending`（含合併規則）與手動推送；四個寫入 action 是同步的，只動快取與佇列
- `useNotify`：全 App 一則 snackbar 訊息，由 `AppShell` 渲染
- 新增的 id 由前端發：`newId` 是 schema 上的必填函式，格式由各表決定（`prefixedId('TPL')` 是現成的前綴式）。後端收到已存在的 id 就當作重送、回傳既有那筆
- 跨表算出來的值靠共用快取的 reactivity 自動重算，不需要跨表失效機制

### 共用元件庫
- 列表：`DataList`（卡片式單列，含長按多選）、`ListField`、`GroupedList`（多層可收合分組）、`DataTable`（表格式，也用於 detail 頁內嵌子表格）
- 詳細：`DataDetail`（自帶 loading/error/找不到資料）、`DetailField`
- 表單：`DataForm`（依 `column.type` 自動選輸入元件）
- 其他：`PageFab`、`TabView`、`RecordNav`、`AppDialog`、`ConfirmDialog`

### 動作系統
- `PageAction` 型別（`{ key, label, icon, onClick, confirm? }`），FAB 與 App Bar 共用同一種描述
- 通用 builder：`useNewAction` / `useEditAction` / `useDeleteAction` / `useBulkDeleteAction`，一律回傳 `ComputedRef<PageAction[]>`
- 需要確認的動作宣告 `confirm` 就好，對話框由 `AppShell` 統一渲染（`useActionRunner`），頁面不用擺 `ConfirmDialog`
- 每張表的動作（含批次刪除）一律從 `use表名Actions(options)` 取，用不到的是空陣列
- `useAppBarActions()` 用 provide/inject 把動作註冊到 App Bar，數量多自動收成下拉選單
- `useBottomActions()` 把動作註冊到螢幕最底端，暫時取代導覽列（表單頁的取消／送出）；兩者共用 `useActionSlot` 的 KeepAlive 防護
- `PageFab` 依數量自動在固定顯示與 speed-dial 之間切換

### 表單與多選
- `useCreateForm` / `useEditForm` 收掉新增與編輯的重複邏輯（起始值、載入、送出、導覽、錯誤狀態）
- 新增表單的預設值三層：schema 的 `default` → `useNewAction` 經 `history.state` 帶來的 → `useCreateForm` 的參數
- `useMultiSelect` + `useLongPress`：長按進入多選，選取狀態由「有沒有選取任何一筆」推導
- 批次刪除走動作的 `confirm`

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
- `bulkUpdate { ids, data }` 的語意是「多筆的指定欄位改成同一個值」，對應批次快速編輯。後端可以直接落到一次 `sheet.getRangeList([...]).setValue(...)`
- `bulkCreate`：等真的有匯入需求再說
- **累積寫入需要通用 batch 端點**（一次請求帶多個操作）。因為佇列裡每筆的值都不同，`bulkUpdate { ids, data }` 涵蓋不了，硬拆成 N 次 `update` 就失去批次的意義

> 註：每分鐘 60 次寫入是 Sheets REST API 的配額，用 Apps Script 內建的 `SpreadsheetApp` 並不適用。批次要省的是**每次 Web App 請求的 script 冷啟成本（約 0.5～2 秒）**，不是配額。

### 累積寫入（已完成，只差持久化）

改動先累積在前端，由使用者按「推送」才一次寫進 Sheet。設計與實作見 [README 4.2](README.md#42-資料流讀取與寫入)。

**排在連續動作前面。** 連續動作的原子性整個建立在這個佇列上（見下面「流程存檔點」），而且佇列一旦存在，寫入路徑、錯誤時機、驗證時機都會變——先做完再疊連續動作，才不會做白工。

**已完成**
- 佇列 `pending`、合併規則、`flush`、`hasPending` / `flushing` / `flushError`
- 四個寫入 action 變成同步的，只動快取與佇列
- App Bar 最右側的同步鈕（`refresh()` ＝ 推送 + 重抓所有已載入的表）+ 未推送圓點標記（失敗轉紅）+ `beforeunload` 攔截
- flush 失敗保持「未推送」狀態並用 snackbar 報錯，讓使用者重按。因為 id 由前端發，整批重送是安全的——刻意**不做**「記錄哪幾筆成功了」的逐筆補償邏輯
- **重抓前一定先 flush**，沒清乾淨就不重抓；沒有「只重抓一張表」的 API
- 跨表寫入順序無所謂。Sheet 沒有外鍵約束，後端也不做合法性驗證，所以父表子表誰先寫都不會壞

**還沒做**
- 佇列持久化（見下面「持久化：先不做」）
- 通用 batch 端點。目前 `flush` 是逐筆送 N 次請求，後端整個還沒開始寫，等接真後端時一起做

**佇列形狀**
```ts
pending: Map<TableKey, Map<id, { kind: 'create' | 'update' | 'delete', values: Record<string, string> }>>
```
快取（`rows`）仍然是**畫面**的單一真相，寫入時照樣就地更新；佇列是**要送什麼**的單一真相。`values` 只累積寫過的欄位，同一筆再改就 shallow merge，不需要跟原始資料做 diff，也不用多留一份快照。上面的合併規則就是這個 map 上的操作，發生在寫入當下而不是 flush 時。

**`values` 在進佇列的當下就序列化**（`serializeRow` 的產物，sheet header 當 key），不存 `Partial<Row>`。理由：那本來就是要送給後端的形狀，flush 拿了就送；而且裡面沒有 `Date` 物件，之後要加持久化時 `JSON.stringify` 直接可用，不必回頭改資料結構。合併規則不受影響，只是 key 從欄位 key 換成 header。

表單一律送整列（不做最小差集），所以 `update` 的 `values` 會是整列——payload 大一點，但省掉在 `useEditForm` 裡比對原始值的複雜度。之後真的需要再優化。

**寫入路徑怎麼變**

現在是**直寫**：`await mutateTable(...)` 成功了才 `patch` 快取（`stores/tables.ts`）。所以今天根本沒有「還沒送出」這個狀態，失敗＝快取不動＝畫面永遠跟後端一致。

改成累積之後順序反過來，而且不等網路：

```ts
const row = { id: newId(), ...values }
patch(table, list => [...list, row])              // ① 立刻改快取，畫面馬上有
enqueue(table, row.id, 'create', values)          // ② 記進佇列
return row                                        // 同步回傳，不 await
```

連帶影響三件事：

- **id 必須由前端發**——不等後端就要有 id 給後續步驟用。✅ 已完成
- **多出「快取有、後端還沒有」這個狀態**——這就是重抓前一定要先 flush 的原因
- **表單送出不再會有後端錯誤**，錯誤全部移到 flush。所以送出當下唯一的把關就是前端驗證（見「資料一致性」）——那本來就該做，佇列只是讓它更明顯

**三個結構的分工**

| | 存什麼 | 誰讀 |
| --- | --- | --- |
| `rows` | 畫面看到的資料。已送出的、沒送出的、流程建的全混在一起，刻意不分——畫面不該關心一筆送出去了沒 | 畫面 |
| `pending` | 還沒寫到後端的那批，定位鍵是 (表, id) | flush |
| `activeFlow.snapshot` | 流程碰過的 key **在被碰之前**的樣子（`rows` 那筆＋`pending` 那筆） | 回滾 |

之後要做「這筆尚未推送」的醒目標記，是去查 `pending` 有沒有這個 key，不是在 `rows` 的資料上加旗標。

> 命名注意：`pending` 是佇列。連續動作裡「等待下一步」的那個回呼是另一個東西，實作時要分開命名（例如 `pendingStep`）。

**持久化：先不做**

佇列只存在記憶體，所以重整／當機／分頁被系統殺掉就會丟掉未推送的變更（`beforeunload` 只擋得住主動關分頁）。可接受，先不做。

要做的話，貴的只有一塊：**開機後要把佇列重新套回 `rows`**。記憶體版裡佇列和快取一起生一起死、永遠一致；持久化之後兩者分家，開機時 `rows` 從後端抓回來不含未推送的東西，必須把佇列重新疊上去（待建立 append、待更新 merge、待刪除移除），否則使用者的未推送新增在畫面上消失了卻還躺在佇列裡。這也需要一個 `coercePartial`（`coerceRow` 會補滿所有欄位，不能拿來做部分合併；`coerceValue` 目前沒 export）。

其餘都便宜，前提是先守住兩條，這樣之後加持久化是純增量而不是改資料結構：

- **`values` 進佇列時就序列化**（見上）——沒有 `Date`，可以直接 `JSON.stringify`
- **流程期間暫停寫入 localStorage**——這條直接消滅了「佇列該活過重整、流程必須死在重整」的衝突。磁碟上的佇列會一直停在流程開始前的樣子，App 中途被殺掉時開機讀到的正好就是回滾後的狀態，不必持久化 snapshot、也不必寫任何開機回滾邏輯。流程正常結束才恢復並寫一次

**流程存檔點**

連續動作要的是「中途取消就整個取消，但不能動到跟這個流程無關的待推送變更」。做法是流程開始時開一個存檔點，記錄它碰過的每個 key **在被碰之前的樣子**（快取那筆＋佇列那筆），同一個 key 只記第一次：

- 取消 → 照 snapshot 還原，原本不存在的就刪掉
- 完成 → 丟掉 snapshot，變更留在佇列裡

例：佇列已有 A、B、C 三項，流程建立了父表列 P、又改了 B 的日期，這時使用者在第二步放棄（下面把巢狀的 (表, id) 縮寫成 `parent:A`）：

```
pending  = { 'parent:A': …,  'parent:B': …（含流程改的日期）,
             'package:C': …,  'package:P': { kind:'create', … } }

snapshot = { 'package:B': { row: 流程碰之前的 B, pending: 流程碰之前的那項 },
             'package:P': { row: 不存在,         pending: 不存在 } }
```

取消 → B 兩邊都還原成流程碰之前的樣子（**不是刪掉**，因為它本來就有待推送變更）；P 從 `rows` 和 `pending` 兩邊移除。A、C 從來沒進 snapshot，一個位元都沒動，而 P 從頭到尾沒送出過。

`package:B` 那一格就是關鍵：同一筆上疊著流程的和非流程的變更，只有原值能把它們拆開。所以要存「碰之前的樣子」而不是「碰過哪些 key」。

**tx 是隱式的**

流程期間的寫入不是連接器做的，是**表單頁**做的——`useCreateForm` 跟連接器隔著一次導覽、是不同的元件，拿不到顯式傳下去的 tx（函式塞不進 `history.state`）。顯式方案只能覆蓋連接器裡自己寫的立即型步驟，變成一半顯式一半隱式，更難懂。

所以 `activeFlow` 是 store 裡的環境狀態，`store.create/update` 自己去看。它的生命週期很短：`router.afterEach` 一律清掉，只有一個地方能設定。

這是蓋在**記憶體佇列**上的 undo log，不是蓋在後端上的補償寫入，所以三個常見的回滾問題都不存在：還原是 Map 操作、不會失敗；沒有中間狀態送到後端；重整時佇列與 snapshot 一起消失，等於什麼都沒寫。

**連續動作的原子性完全依賴這個佇列**，所以順序是先把 store 與佇列整理好，再做連續動作。

### 資料一致性
- **前端驗證**：form 層已完成（`schema/validation.ts` 的 `validateRow`＋`SchemaColumn` 上的 `required`／`min`／`max`，見 [README 4.5](README.md#45-schema-的角色)）。剩下的：
  - **store 寫入層還沒接**同一個 `validateRow`。等累積寫入把寫入路徑定下來再做，免得白搬一次
  - 日期範圍、文字長度、正則格式都還沒有，等真的有需求再加進 `SchemaColumn`
  - `ref` 欄位不檢查目標是否存在。等關聯選擇器做好（見「UI 功能」），改成用選的就不會填到不存在的
- 驗證的分工已定案，見 [README 4.5](README.md#45-schema-的角色)：合法性只在前端做，一份 schema 推導出的驗證函式用在 form 層（即時提示）與 store 寫入層（擋程式 bug）兩處；後端只做安全性與結構完整性
- 樂觀鎖定：`updatedAt` 欄位與衝突提示都還沒做

### UI 功能
- 搜尋列、篩選、排序的操作介面（目前排序只有 schema 的 `defaultSort`，使用者不能自己改）
- `ref` 欄位的關聯選擇器：`DataForm` 目前把 `ref` 當純文字輸入，應該換成從對方表撈資料的下拉選單
- 圖片欄位與上傳（存 Google Drive）
- 總覽頁範本（`DataDashboardTemplate`）：保留了位置但沒有具體需求
- `TabView` 放多個獨立面板（例如兩張表的列表當成一組頁籤）目前只有內容層可用，動作層會壞掉。根源是兩個面板一旦都被看過就同時掛著（`v-window` 用 `v-show` 切換），而 FAB 與 App Bar 動作都假設同時只有一個頁面活著：
  - `useAppBarActions` 是單一 setter，後掛載的會蓋掉前面的，切頁籤也不會重新註冊
  - `PageFab` 靠 `onActivated`/`onDeactivated` 決定要不要 teleport，那是 `<KeepAlive>` 的 hook，`v-show` 切換不會觸發，於是兩顆 FAB 一起掛在 body 上
  - `useListOrder` 沒有 active 判斷，兩個面板都會把自己的順序發布到同一個 key、互相蓋掉，detail 頁的上/下一筆會跟著錯亂
  - 方向是讓面板知道自己是不是當前頁籤（面板收一個 `active` prop，`PageFab` 也加一個跟現有 KeepAlive 狀態做 AND、預設 `true`），但實際要傳到哪一層等真的要寫這種頁面時再定。修好之後 `template/` 要補上這種頁面的寫法

### 多選與批次
- 批次快速編輯：把選取的多筆的指定欄位改成同一個值。`bulkUpdate` 目前只有假後端與 `mutateTable` 支援，store 沒有對應 action，也沒有 UI 入口
- 多選模式不要自動取消，改成右上角出現 X 才關閉
- 全選（考慮中）

### 連續動作（設計已定，還沒實作）

**排在累積寫入後面**，因為原子性靠那個佇列。

一個「連接器」動作用一段 async 程式碼把數個步驟串起來，控制權在每一步之間回到它手上。連接器自己就是一個普通的 `PageAction`（`onClick` 的型別本來就允許 async），照樣交給 `PageFab`。

歸屬規則：**掛在流程起點那張表的 actions 底下**（例如 `use父表Actions().newWithChild`），即使流程跨表也一樣。呼叫端就是那個頁面，而「頁面只從一個地方取動作」要成立，歸屬規則必須明確，「起點」是唯一不含糊的。等流程多到三四個再拆獨立檔案，那時該表的 actions 變成 re-export。

```ts
onClick: async () => {
  const row = await runStep('/parent/new', { status: '已下單' })    // 導覽型
  const date = await askDate('選擇日期')                            // 對話框型
  await store.update('parent', row.id, { date })                   // 立即型
  router.replace(`/parent/${row.id}`)                              // 收尾
}
```

**三種步驟，只有第一種需要額外機制**

| 種類 | 例子 | 需要什麼 |
| --- | --- | --- |
| 導覽型 | 開新增／編輯表單 | `history.state` 把預設值送過去 ＋ module 變數把結果送回來 |
| 對話框型 | 選日期的小視窗 | 一個普通的 promise，按確定時 resolve |
| 立即型 | 日期改成今天 | 什麼都不用，就是一次 `await store.update` |

> 這也是不採用「把整條鏈序列化成資料」那個方案的原因之一：序列化的鏈表達不了後兩種步驟，也沒辦法在中途做判斷。

**導覽型步驟怎麼運作**

- 資料往前傳走 `history.state`（就是現在的 `defaults`，不用改）；控制權往回傳走一個 module 變數，因為函式塞不進 `history.state`
- `runStep` ＝ `router.replace(目的地, { state: { defaults } })`，然後註冊一個回呼並回傳 promise。目的地收 `RouteLocationRaw`（跟 `leaveAfterAction` 一致），這樣吃得到 `typed-router.d.ts` 的型別檢查，也不用為了「只支援 `/表/new`」另開 API
- `useCreateForm` 送出成功後多一個分岔：有等待中的回呼就把建好的 row 交出去，沒有就照舊 `leaveAfterAction`。**`useEditForm` 接同一個掛勾點**，所以中間步驟可以是編輯表單——結構一模一樣，多三行，只支援新增會很怪
- **通用動作（`useNewAction` 那些）一行都不用改**
- 每步都用 `replace`，做完的表單不留在歷史裡，任何一步按返回都回到鏈的起點

**取消**

- `router.afterEach` 一律中止流程。返回鍵、導覽列、連結、改網址全部算放棄；重整更是自動的（module 變數本來就會死）
- 唯一不被中止的是「送出成功→流程自己前進」，靠順序保證：`await router.replace(...)` 是在 `afterEach` 跑完之後才 resolve 的
- 對話框型步驟也要能被中止——掛在 `AppShell` 上的對話框會跨路由存活，不中止的話換頁後它還開著
- 中止是 **reject 而不是靜默丟掉**，因為連接器要跑回滾（見上面「流程存檔點」）

**「完成後去哪」不是獨立需求**

它就是連接器的最後一行 `router.replace(...)`。所以「新增完直接進那筆的 detail」只是一步的鏈，不需要給 `useNewAction` 加任何參數。

**錯誤**

- 送出失敗（不管第幾步）維持現況：停在當下那張表單、錯誤顯示在它的 alert 上、流程不前進
- 連接器自己拋錯要另外處理。那時候該步驟往往已經成功了，把錯誤塞進那張表單會讓使用者以為新增失敗而再按一次、建出重複的資料。做法是走 `leaveAfterAction` 把人帶離，錯誤用全域方式顯示

**全域訊息（新元件，目前不存在）**

`ConfirmDialog` 的 error 只有確認框開著時才看得到，不能拿來報流程的錯。要新增的是 **snackbar**：`AppShell` 掛一個 `<v-snackbar>` 加一個 ref，再加一個 module-level 的觸發函式（`useNotify()`），大概十行。選它的理由是改動最小（錯誤對話框要另開 SFC），而且要的本來就不只是錯誤——「已刪除」「已推送」之後都會用到，錯誤只是其中一種 type。

**不做進度指示**（第 1 步／共 2 步）。步驟頂多兩三步，每一步是完整的一頁、App Bar 上有自己的標題，使用者知道自己在哪。等真有四步以上再說。

**還沒決定**

- 中途放棄後要不要提示使用者——有了存檔點理論上不需要（什麼都沒完成），但「剛剛那一步白填了」這件事要不要講一聲，等實際用過再決定

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

- **`refTable` 沒有型別檢查**：只存代稱字串，不保證真的存在於 `schemas`。為了避免 `schema/types.ts` 反向 import `schema/index.ts` 造成循環依賴，先接受
- **`template/` 不在 `src/` 底下**，所以不會被 lint 與型別檢查掃到，元件 props 改了範本不會自動報錯。目前靠「把範本複製成一張暫時的表、建置過再刪掉」手動驗證
- **刪除時會閃一下「找不到這筆資料」**：快取更新後、返回動畫還在跑的期間，detail 頁的 row 已經是 null。因為那筆資料確實已經不存在，語意上可接受，所以沒有為它增加凍結顯示的機制
