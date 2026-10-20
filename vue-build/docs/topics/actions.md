# 動作（Action）

畫面上可以按的東西：如何描述一個動作、可以放在哪裡、如何執行，以及內建的 builder、連續動作與快速編輯對話框。

> **前置**：畫面各部位的名稱（App Bar、FAB、底部動作列）見 [design/README.md](../design/README.md)。完成動作後如何離開頁面、表單的離開確認見 [pages.md](pages.md)。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../../ROADMAP.md)。

---

## 概要

所有可以按的動作都使用同一種描述 `PageAction`。動作由各表的 `use表名Actions` 或頁面宣告，放在哪個位置由頁面決定，按下後統一交由 `useRunAction` 執行（確認框、錯誤提示）。

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
| `icon` | **一律要給**，底部動作列亦同 |
| `onClick` | 動作本體。要導覽就在裡面 `router.push` |
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
| 列表的每一列 | view 的 `actions` | 該列的動作，deck 置於右下角欄位的下一列，profile 收於右側的 ⋮ 選單，gallery 收於右下角的 ⋮ 選單（見「列上的動作」） |
| 詳細頁的標頭 | `DetailPage` 的 `header`（view 的 `actions`） | 這一筆的動作，置於標頭圖片下方的左右各兩格（見「列上的動作」） |

- **每個位置都接收 `(PageAction | null)[]`**，`null`（不適用的動作）會被略過，所以頁面組陣列時不需要判斷。略過由最後畫按鈕的元件（`PageFab`、`ChildList`、`AppShell`）負責，中間的版面元件與登記機制一律原樣轉交
- **陣列的順序即為顯示的順序**
- **`useAppBarActions`／`useBottomActions` 接收 getter**，回傳值改變時自動重新登記，通常寫成 `() => [xxx.value]`
- **一次只有一個頁面的動作算數**：被 `<KeepAlive>` 收起來的頁面、以及 `TabPage` 裡不是當前頁籤的面板，動作與 FAB 都會自動讓開（見 [TabPage.md](../components/panel/TabPage.md)），頁面自己不用判斷

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

每張表的動作一律從 `use表名Actions(options)` 取，範本為 [template/table/use__Table__Actions.ts](../../template/table/use__Table__Actions.ts)。

- **呼叫端只提供自身具備的參數**：列表頁提供 `selectedIds`／`onDone`，需要新增預設值時提供 `defaults`。用不到的動作為 `null`
- **回傳物件包含兩種項目**：
  - 不以列為參數的動作（`new`、`bulkDelete`）已以 `useAction` 包裝，型別為 `ComputedRef<PageAction | null>`，可直接交給位置
  - 以列為參數的動作（`edit`、`delete`）為接收一列並回傳動作的函式。detail 頁以 `useRowAction` 綁定至當前那一列；列表於 view 的 `actions` 中直接以該列呼叫（見「列上的動作」）。`fieldActions` 同樣以一列呼叫
- **自訂的動作**（包括連續動作）亦定義於此：不以列為參數者以 `useAction(() => ({ … }))` 包裝，以列為參數者寫成 `(row) => …`。範本回傳物件的末尾附有連續動作的示範
- **一個位置放哪幾個動作由頁面決定**：頁面取出需要的動作，組成陣列交給該位置

取用方式見範本：

- **detail 頁**（`template/pages/detail.vue`）：以 `useRowAction` 將 `edit`、`delete` 綁定至當前那一筆，編輯交給 `DetailPage` 的 `fab`，刪除以 `useAppBarActions` 放上 App Bar，`fieldActions` 交給 `DetailPage`
- **列表頁**（`template/pages/list.vue`）：傳入多選的 `selectedIds` 與 `onDone`，新增交給 `ListPage` 的 `fab`，批次刪除以 `useAppBarActions` 放上 App Bar
- **列上的動作**（`template/pages/profile-list.vue` 等）：於 view 的 `actions` 中以該列呼叫（見「列上的動作」）

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

- **欄位動作不是內建的**：ref 的「前往對方」與開啟網址、改為今天等同樣是 builder，需要時才列入

---

## 列上的動作

每一列的動作與欄位一起定義於 view（見 [DataList](../components/list/DataList.md) 的「view」）：自 `use表名Actions` 取出以列為參數的動作，於 view 的 `actions` 中以該列呼叫，回傳動作的陣列。範本見 `template/pages/profile-list.vue`、`gallery-list.vue`，左右各兩格的寫法見 `card-list.vue`。

- **陣列依位置排列，`null` 表示空位**：card 與 detail 標頭的前兩個置於左側、後兩個置於右側；deck、profile 與 gallery 略過空位。builder 判斷不適用而回傳的 `null` 亦同：card 與 detail 標頭中保留該格，deck、profile 與 gallery 中略過
- **`display`** 決定該動作顯示為圖示或文字
- **deck**：由 [ViewActions](../components/view/ViewActions.md) 呈現於右下角欄位的下一列，由左往右排列、整組靠右；沒有動作時不佔高度；多選模式下隱藏。按鈕與整列的連結並列而非包在連結內，點擊按鈕不會進入 detail
- **profile**：由 ViewActions 的 `variant="menu"` 收入卡片右側的 ⋮ 選單，只有一個動作時亦同；沒有動作時不顯示 ⋮；多選模式下隱藏。⋮ 與卡片的連結並列，點擊 ⋮ 不會進入 detail（見 [DataProfile](../components/list/DataProfile.md)）
- **gallery**：與 profile 相同，收入 ⋮ 選單，置於格子的右下角（見 [DataGallery](../components/list/DataGallery.md)）
- **card**：由 ViewActions 的 `variant="slots"` 呈現於第 4 層，前兩個靠左、後兩個靠右，`null` 保留為空格，超過四個的部分不顯示；四格皆為 `null` 時整層隱藏；多選模式下隱藏。點擊按鈕不會進入 detail，按鈕之間的空白處仍屬於連結（見 [DataCard](../components/list/DataCard.md)）
- **detail 標頭**：與 card 相同，由 ViewActions 的 `variant="slots"` 呈現於標頭圖片（或文字）的下方。標頭於資料載入後才渲染，`row` 必定存在，因此直接呼叫以列為參數的動作，不需經過 `useRowAction`（見 [DetailHeader](../components/record/DetailHeader.md)）

---

## 連續動作（流程）

好幾個步驟要一氣呵成時（新增父表那筆後直接進它的 detail、或接著新增子表那筆），用 `useFlow` 串成一段 async 程式碼，整段包成一個動作：動作的 `onClick` 呼叫 `runFlow`，其中依序 `await runStep(…)` 開啟各張表單並取回建好的那筆，最後換頁。範本見 `template/table/use__Table__Actions.ts` 末尾的 `newWithChild`（註解中）。

- **`runStep(to, defaults?)`** 用 `replace` 開一張表單、等它送出成功、拿回建好或改好的那筆。`defaults` 走 `history.state`，跟 `newAction` 同一條通道，所以只能放普通值（不能 reactive、不能函式）
- **表單不用改**：送出成功後先問 `resumeStep()`，有步驟在等就交棒、頁面不離開；沒有就照舊 `leaveAfterAction`。這是 `useCreateForm`／`useEditForm` 裡唯一為流程多出的分岔
- **任何導覽都算放棄**：守衛放行後 `router.afterEach` 會 reject 等待中的步驟，`runFlow` 接到 `FlowCancelled` 就 `rollbackFlow()`，整條流程的快取與佇列改動一次還原
- **連接器拋錯**（不是取消）也會 rollback，另外以 snackbar 回報錯誤，並以 `leaveAfterAction('/')` 帶離目前的頁面
- **流程進行中不能推送**：`flush()` 拒絕執行（表單開著時同步鈕亦停用，見 [store.md](store.md)）
- **流程掛在起點那張表**的 `use表名Actions` 底下，跨表也一樣
- **流程不能套疊**：第二個 `beginFlow` 直接拋錯
- **中途離開時的確認**（第二步之後一律詢問）見 [pages.md](pages.md#離開表單前先問)

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
- 內容就是 `DataForm` 加 `only` prop 只顯示那幾欄：輸入元件、驗證、錯誤顯示全部沿用。驗證只檢查被詢問的欄位；有給 `options.rows` 時，主鍵那一欄唯讀
- **初始值三層**：`options.rows` 剛好一筆且那欄非空 → 現值；否則 `options.defaults[key]`（值或函式）；都沒有 → 空。**不套用 schema 的 `default`**。多筆時不顯示現值
- 通用的用法包成 `quickEditAction(table, keys, ids, { label, icon, defaults, onDone })`：沒有選取任何一筆時回傳 `null`，所以只在多選模式下出現；確定後對每個 id 各跑一次 `store.update`（不另開 op 種類）
- 只是要問是／否就用 `confirm(title, text): Promise<boolean>`，動作的 `confirm` 宣告與離開守衛都用它；要給兩條以上的出路用 `choose(title, text, choices): Promise<string | null>`（同一個對話框實例，見 [ConfirmDialog.md](../components/dialog/ConfirmDialog.md)）
- 一次要問的欄位放在同一個對話框
