# 動作（Action）

畫面上可以按的東西：如何描述一個動作、可以放在哪裡、如何執行，以及內建的 builder、連續動作與快速編輯對話框。

> **前置**：畫面各部位的名稱（App Bar、FAB、底部動作列）見 [ui.md](ui.md)。完成動作後如何離開頁面、表單的離開確認見 [architecture.md](architecture.md)。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../ROADMAP.md)。

---

## 概要

所有可以按的動作都使用同一種描述 `PageAction`。動作由各表的 `use表名Actions` 或頁面宣告，放在哪個位置由頁面決定，按下後統一交由 `useRunAction` 執行（確認框、錯誤提示）。因此同一個動作可以直接搬到另一個位置，不需要修改。

---

## PageAction

```ts
interface PageAction {
  key: string
  label: string
  icon: string
  onClick: () => void | Promise<void>
  confirm?: { title: string, text: string }
  display?: 'icon' | 'text'
}
```

| 欄位 | 說明 |
| --- | --- |
| `key` | 同一組動作中不可重複 |
| `label` | 動作的文字。只顯示圖示的位置用作 `aria-label` |
| `icon` | **一律要給**。底部動作列雖然只顯示文字，但形狀統一，同一個動作搬到別的位置不用補東西 |
| `onClick` | 動作本體。要導覽就在裡面 `router.push`（理由見「設計取捨」） |
| `confirm` | 有宣告就先跳出確認框，確定後才執行 `onClick` |
| `display` | 列上的動作用（見「列上的動作」）：顯示為圖示或文字，預設為圖示 |

---

## 擺在哪裡

| 位置 | 怎麼註冊 | 用途 |
| --- | --- | --- |
| 右下角 FAB | `ListPage`／`DetailPage` 的 `fab` prop，自己組版面時用 `<PageFab :actions="...">` | 主要動作。≤2 顆固定顯示，≥3 顆收合成 speed-dial |
| App Bar 右側 | `useAppBarActions(() => [...])` | 次要動作。≤2 顆直接顯示，≥3 顆收成「⋮」下拉。多選的「取消」是例外，永遠在外面、在同步鈕左邊（`useMultiSelect` 自己登記） |
| 螢幕最底端 | `useBottomActions(() => [...])` | 暫時取代底部導覽列，離開頁面自動還原。表單的取消／送出不用自己接，`useCreateForm`／`useEditForm` 會登記 |
| 詳細頁的單一欄位 | `DataDetail`／`DetailPage` 的 `fieldActions` | 該欄的動作，右邊出現圖示、整格可點（見「欄位動作」） |
| 子表區塊 | `ChildList` 的 `actions` prop | 排在「展開」旁邊，通常是新增 |
| 列表的每一列 | view 的 `actions` | 該列的動作，deck 置於右下角欄位的下一列，profile 收於右側的 ⋮ 選單（見「列上的動作」） |

- **每個位置都接收 `(PageAction | null)[]`**，`null`（不適用的動作）會被略過，所以頁面組陣列時不需要判斷。略過由最後畫按鈕的元件（`PageFab`、`ChildList`、`AppShell`）負責，中間的版面元件與登記機制一律原樣轉交（理由見「設計取捨」）
- **陣列的順序即為顯示的順序**
- **`useAppBarActions`／`useBottomActions` 接收 getter**，回傳值改變時自動重新登記，通常寫成 `() => [xxx.value]`
- **一次只有一個頁面的動作算數**：被 `<KeepAlive>` 收起來的頁面、以及 `TabView` 裡不是當前頁籤的面板，動作與 FAB 都會自動讓開（見 [TabView.md](components/TabView.md)），頁面自己不用判斷

---

## 執行

- **需要確認的動作只要宣告 `confirm: { title, text }`**，不用自己擺 `ConfirmDialog`：`AppShell` 提供的 `runAction` 會先 `await confirm()`，說好才跑 `onClick`；`onClick` 拋錯一律進 snackbar
- **自行渲染動作按鈕的元件**（例如 `PageFab`、`DetailField`）一律透過 `useRunAction()` 取得執行函式，不直接呼叫 `onClick`，確認框與錯誤提示才會生效。不在 `AppShell` 底下時退回直接執行

---

## 內建 builder 一覽

內建 builder 皆為一般函式，位於 `composables/actions/useTableActions.ts`：傳入當下的值（表、該列、選取的 id），回傳一個 `PageAction`，不適用時回傳 `null`。外觀與行為分開傳：有預設外觀的 builder，最後一個參數一律是 `look`（`ActionLook`，`{ label?, icon? }`），省略時使用預設的文字與圖示；行為的設定（`newAction` 的 `{ defaults }`、刪除的 `onDone`）放在它前面。只換外觀時，前面那個參數傳 `{}` 或 `undefined`。`quickEditAction` 與 `setFieldAction` 沒有預設外觀，`label` 與 `icon` 為必填，與其他設定放在同一個物件中。

| 函式 | 回傳 | 說明 |
| --- | --- | --- |
| `newAction(table, { defaults? }?, look?)` | `PageAction` | 開啟新增表單。`defaults` 可為值、ref 或 getter，於按下時求值，經 `history.state` 帶入表單 |
| `editAction(table, row, look?)` | `PageAction` | 開啟該列的編輯表單 |
| `deleteAction(table, row, onDone?, look?)` | `PageAction` | 確認後刪除該列（含 cascade 的子列），完成後呼叫 `onDone`。若刪除的是目前 detail 頁所顯示的那一列，會自動以 `leaveAfterAction` 離開 |
| `bulkDeleteAction(table, ids, onDone?, look?)` | `PageAction \| null` | 確認後刪除選取的各列，完成後呼叫 `onDone`（列表頁用來清除選取）；未選取任何一列時為 `null` |
| `quickEditAction(table, keys, ids, { label, icon, key?, defaults?, onDone? })` | `PageAction \| null` | 以對話框詢問 `keys` 這幾欄，將選取的各列改為同一個值；未選取任何一列時為 `null`（見「快速編輯對話框」） |
| `goToRefAction(row, key, refTable, look?)` | `PageAction \| null` | 前往 ref 欄位指向的那一列；欄位為空時為 `null` |
| `openUrlAction(row, key, look?)` | `PageAction \| null` | 以新分頁開啟該欄的網址；不是 http(s) 網址時為 `null` |
| `setFieldAction(table, row, key, value, { label, icon, confirm? })` | `PageAction` | 立即將該欄改為 `value()`。`value` 為函式，於按下時求值（例如 `() => new Date()`） |

交給 FAB、App Bar 等位置的動作須隨資料更新，以下列兩個函式包裝：

| 函式 | 回傳 | 說明 |
| --- | --- | --- |
| `useAction(build)` | `ComputedRef<PageAction \| null>` | 供各表的 `use表名Actions` 使用。`build` 回傳一個動作或 `null`，資料變更時重新求值 |
| `useRowAction(row, build)` | `ComputedRef<PageAction \| null>` | 供 detail 頁使用，將以列為參數的動作綁定至當前那一列。`row` 為 Ref；尚未載入時為 `null`，載入後以該列呼叫 `build` |

欄位動作與列上的動作則直接以該列呼叫，無須包裝。

---

## 各表的 use表名Actions

每張表的動作一律從 `use表名Actions(options)` 取，範本為 [template/table/use__Table__Actions.ts](../template/table/use__Table__Actions.ts)。

- **呼叫端只提供自身具備的參數**：列表頁提供 `selectedIds`／`onDone`，需要新增預設值時提供 `defaults`。用不到的動作為 `null`
- **回傳物件包含兩種項目**：
  - 不以列為參數的動作（`new`、`bulkDelete`）已以 `useAction` 包裝，型別為 `ComputedRef<PageAction | null>`，可直接交給位置
  - 以列為參數的動作（`edit`、`delete`）為接收一列並回傳動作的函式。detail 頁以 `useRowAction` 綁定至當前那一列；列表於 view 的 `actions` 中直接以該列呼叫（見「列上的動作」）。`fieldActions` 同樣以一列呼叫
- **自訂的動作**（包括連續動作）亦定義於此：不以列為參數者以 `useAction(() => ({ … }))` 包裝，以列為參數者寫成 `(row) => …`。範本回傳物件的末尾附有連續動作的示範
- **一個位置放哪幾個動作由頁面決定**：頁面取出需要的動作，組成陣列交給該位置

detail 頁的取用方式：

```ts
const { delete: remove, edit, fieldActions } = use__Table__Actions()
const editAction = useRowAction(row, edit)
const deleteAction = useRowAction(row, remove)
useAppBarActions(() => [deleteAction.value])
```

```vue
<DetailPage :fab="[editAction]" :field-actions="fieldActions" … />
```

列表頁的取用方式（列上的動作見「列上的動作」）：

```ts
const { new: newAction, bulkDelete, edit, delete: remove } = use__Table__Actions({
  selectedIds: selection.selectedIds,
  onDone: selection.clear,
})
useAppBarActions(() => [bulkDelete.value])

const view = defineView(__table__Schema, { title: 'name', actions: row => [edit(row), remove(row)] })
```

`delete` 為 JavaScript 的保留字，解構時須改名（例如 `remove`）。

---

## 欄位動作

detail 頁欄位右邊的動作由 `fieldActions` 決定，型別為 `FieldActions<Row>`：欄位 key → `(row) => PageAction | null`，一欄一個。`DataDetail` 以目前那一列呼叫，回傳 `null` 時該欄沒有動作。

```ts
const fieldActions: FieldActions<__Table__Row> = {
  parent: row => goToRefAction(row, 'parent', 'parent'),
  date: row => setFieldAction('__table__', row, 'date', () => new Date(), { label: '改成今天', icon: mdiCalendarToday }),
}
```

- **欄位動作不是內建的**：ref 的「前往對方」跟開網址、改成今天一樣是 builder，要就列進去、不要就不列——沒有「空陣列代表內建」這種第三態

---

## 列上的動作

每一列的動作與欄位一起定義於 view（見 [DataList](components/DataList.md) 的「view」）。自 `use表名Actions` 取出以列為參數的動作，以該列呼叫：

```ts
const { edit, delete: remove } = use__Table__Actions()
const view = defineView(__table__Schema, {
  title: 'name',
  actions: row => [edit(row), remove(row)],
})
```

- **陣列依位置排列，`null` 表示空位**：card 與 detail 標頭的前兩個置於左側、後兩個置於右側；deck 與 profile 略過空位。builder 判斷不適用而回傳的 `null` 亦同：card 中保留該格，deck 與 profile 中略過
- **`display`** 決定該動作顯示為圖示或文字
- **deck**：由 [ViewActions](components/ViewActions.md) 呈現於右下角欄位的下一列，由左往右排列、整組靠右；沒有動作時不佔高度；多選模式下隱藏。按鈕與整列的連結並列而非包在連結內，點擊按鈕不會進入 detail
- **profile**：由 ViewActions 的 `variant="menu"` 收入卡片右側的 ⋮ 選單，只有一個動作時亦同；沒有動作時不顯示 ⋮；多選模式下隱藏。⋮ 與卡片的連結並列，點擊 ⋮ 不會進入 detail（見 [DataProfile](components/DataProfile.md)）
- 🔲 card 與 detail 標頭的左右各兩格，尚未實作（見 ROADMAP 的「頁面類型」）

---

## 連續動作（流程）

好幾個步驟要一氣呵成時（新增父表那筆後直接進它的 detail、或接著新增子表那筆），用 `useFlow` 串成一段 async 程式碼，整段包成一個動作：

```ts
onClick: () => runFlow(async () => {
  const row = await runStep<ParentRow>('/parent/new', { status: '已下單' })
  router.replace(`/parent/${row.id}`)
})
```

- **`runStep(to, defaults?)`** 用 `replace` 開一張表單、等它送出成功、拿回建好或改好的那筆。`defaults` 走 `history.state`，跟 `newAction` 同一條通道，所以只能放普通值（不能 reactive、不能函式）
- **表單不用改**：送出成功後先問 `resumeStep()`，有步驟在等就交棒、頁面不離開；沒有就照舊 `leaveAfterAction`。這是 `useCreateForm`／`useEditForm` 裡唯一為流程多出的分岔
- **任何導覽都算放棄**：守衛放行後 `router.afterEach` 會 reject 等待中的步驟，`runFlow` 接到 `FlowCancelled` 就 `rollbackFlow()`，整條流程的快取與佇列改動一次還原
- **連接器拋錯**（不是取消）也會 rollback，另外用 snackbar 報錯並 `leaveAfterAction('/')` 把人帶離——那一步的表單多半已經送出，留在上面會讓人以為失敗而重按
- **流程進行中不能推送**：`flush()` 拒絕執行（同步鈕本來就因為表單開著而停用，見 [store.md](store.md)）
- **流程掛在起點那張表**的 `use表名Actions` 底下，跨表也一樣
- **流程不能套疊**：存檔點只有一格，第二個 `beginFlow` 直接拋錯
- **中途離開時的確認**（第二步之後一律詢問）見 [architecture.md](architecture.md#離開表單前先問)

連接器只有兩條規則：**只用 `runStep` 導覽到表單；結尾一定要有一個離開的導覽。**

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
- 通用的用法包成 `quickEditAction(table, keys, ids, { label, icon, defaults, onDone })`：沒有選取任何一筆時回傳 `null`，所以只在多選模式下出現；確定後對每個 id 各跑一次 `store.update`（不另開 op 種類，佇列的合併規則直接適用）
- 只是要問是／否就用 `confirm(title, text): Promise<boolean>`，動作的 `confirm` 宣告與離開守衛都用它；要給兩條以上的出路用 `choose(title, text, choices): Promise<string | null>`（同一個對話框實例，見 [ConfirmDialog.md](components/ConfirmDialog.md)）
- 一次要問的欄位放在同一個對話框。連續動作是給「一步的結果決定下一步」用的，欄位之間沒有相依，拆開只是多按幾次確定

---

## 設計取捨

**為什麼 `PageAction` 只有 `onClick`、沒有宣告式的 `to`**
求值時機：action 物件在頁面 setup 時就建好，寫進 `to` 的值那時就定型，切了頁籤再按新增會帶到舊狀態。統一成一種也免得兩個都設時變成「導覽 + 執行」兩件事一起發生。代價是動作渲染成 `<button>` 而非 `<a>`，失去中鍵開新分頁與連結的無障礙語意——這個 App 的動作都在 FAB 與 App Bar 上，用不太到。

**ref 欄位那格為什麼是按鈕不是連結**
從 `<RouterLink>` 變成 `<button>` 之後中鍵開新分頁沒了，跟 `PageAction` 沒有 `to` 是同一個取捨。導覽用 `push`，回來時 detail 還在。

**為什麼 `confirm` 是宣告式、`askFields` 不是**
`confirm` 對每個動作都一樣、動作本體不需要知道結果，所以做成語法糖。`askFields` 的結果是動作要拿去用的，只能在 `onClick` 裡自己 `await`。

**為什麼 builder 是一般函式而非 composable**
同一個 builder 需用於 detail 頁當前那一筆（會變動的 Ref）、欄位動作，以及列表的每一列（view 的 `actions`）。若 builder 本身為 composable（接收 Ref、回傳 computed），每一列每次求值都會建立一個 computed，也違反 composable 僅於 setup 中呼叫的慣例。改為一般函式後，每次呼叫僅建立一個普通物件；只有交給 FAB 與 App Bar 的那一層需要隨資料更新，由 `useAction`／`useRowAction` 負責。

**為什麼以列為參數的動作由頁面綁定，而非 `use表名Actions`**
「綁定至當前那一列」僅在 detail 頁成立；列表的每一列則各自呼叫。若由 `use表名Actions` 負責綁定，它便必須得知自己供哪一種頁面使用，列表也無法取得可逐列呼叫的版本，同一個動作勢必定義兩份。因此 `use表名Actions` 只負責定義，綁定交由需要的頁面（`useRowAction`）處理。

**為什麼刪除後自動離開**
「刪除目前所顯示的那一列後離開該頁」在任何頁面皆成立，不應要求每個 detail 頁各自傳入 `leaveAfterAction`；若由頁面傳入，漏傳時仍可通過編譯，刪除後卻停留在「找不到這筆資料」的畫面。因此 `deleteAction` 在刪除後檢查目前的路由是否為該列的 detail 頁，若是則自動離開；`onDone` 僅用於其他額外的處理。

**為什麼 `use表名Actions` 的每一項是單一動作，而非陣列**
一個位置放哪幾個動作是頁面的決定，所以由頁面組陣列（`[editAction.value, deleteAction.value]`）。不適用的動作以 `null` 表示，由接收的位置略過；`null` 的處理集中在框架的幾個位置元件中，頁面與 `use表名Actions` 都不需要判斷。早期的 builder 一律回傳 `ComputedRef<PageAction[]>`，以空陣列表示不適用，但這讓單一動作也必須包成陣列，而且陣列的名稱與內容（只有一個動作）不一致。

**為什麼 `null` 由畫按鈕的元件處理，而非中間層**
不同位置對 `null` 的解讀不同：FAB、App Bar、子表區塊、deck 與 profile 會略過它，日後的 card 與 detail 標頭則把它當成空格、保留位置（見 ROADMAP 的「頁面類型」）。只有最後畫按鈕的元件知道 `null` 在該處代表什麼，若在版面元件或登記機制等中間層統一過濾，空格的資訊就會遺失。

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
