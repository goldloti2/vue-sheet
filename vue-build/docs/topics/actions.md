# 動作（Action）

畫面上可以按的元素：動作的描述方式、可以放置的位置、執行方式，以及內建的 builder、連續動作與快速編輯對話框。

> **前置**：畫面各部位的名稱（App Bar、FAB）見 [design/README.md](../design/README.md)。表單層、完成動作後的離開方式與離開確認，見 [pages.md](pages.md)。

> **標記**：沒有標記表示已實作。🔶 為部分實作，🔲 為尚未實作。詳細進度見 [ROADMAP.md](../../../ROADMAP.md)。

---

## 概要

所有可以按的動作都使用同一種描述 `PageAction`。
- 動作由各表的 `use表名Actions` 或頁面宣告
- 動作放置的位置由頁面決定
- 按下後統一交由 `useRunAction` 執行，處理確認框與錯誤提示

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
| `label` | 動作的文字。只顯示圖示的位置，以此作為 `aria-label` |
| `icon` | **一律須提供** |
| `onClick` | 動作本體。須開啟表單時，呼叫 `openForm`。須前往其他頁面時，呼叫 `router.push` |
| `confirm` | 宣告時，先顯示確認框，確定後才執行 `onClick` |
| `display` | 用於列上的動作（見「列上的動作」）：顯示為圖示或文字，預設為圖示 |

---

## 放置的位置

| 位置 | 登記方式 | 用途 |
| --- | --- | --- |
| 右下角的 FAB | `ListPage`、`DetailPage` 的 `fab` prop。自行組合版面時，使用 `<PageFab :actions="...">` | 主要的動作。2 個以下固定顯示，3 個以上收合為 speed-dial |
| App Bar 右側 | `useAppBarActions(() => [...])` | 次要的動作。2 個以下直接顯示，3 個以上收進「⋮」選單。多選的「取消」例外：一律在選單外、同步按鈕左側，由 `useMultiSelect` 自行登記 |
| 詳細頁的單一欄位 | `DataDetail`、`DetailPage` 的 `fieldActions` | 該欄的動作：右側出現圖示，整格可點擊（見「欄位動作」） |
| 子表區塊 | `ChildList` 的 `actions` prop | 排在「展開」旁，通常為新增 |
| 列表的每一列 | view 的 `actions` | 該列的動作。deck 置於右下角欄位的下一行，profile 收於右側的 ⋮ 選單，gallery 收於右下角的 ⋮ 選單（見「列上的動作」） |
| 詳細頁的標頭 | `DetailPage` 的 `header`，即 view 的 `actions` | 這一列的動作，置於標頭圖片下方的左右各兩格（見「列上的動作」） |

- **每個位置都接收 `(PageAction | null)[]`**：`null`（不適用的動作）略過，因此頁面組合陣列時無須判斷。略過由最後繪製按鈕的元件負責（`PageFab`、`ChildList`、`AppShell`），中間的版面元件與登記機制一律原樣轉交
- **陣列的順序即顯示的順序**
- **`useAppBarActions` 接收 getter**：回傳值改變時，自動重新登記。通常寫成 `() => [xxx.value]`
- **一次只有一個頁面的動作生效**：被 `<KeepAlive>` 收起的頁面，以及 `TabPage` 中不是目前頁籤的面板，其動作與 FAB 自動讓開（見 [TabPage.md](../components/panel/TabPage.md)）。頁面無須自行判斷

---

## 執行

- **須確認的動作，只要宣告 `confirm: { title, text }`**，無須自行放置 `ConfirmDialog`：
  - `AppShell` 提供的 `runAction` 先 `await confirm()`，使用者確定後才執行 `onClick`
  - `onClick` 拋出的錯誤一律顯示於 snackbar
- **自行繪製動作按鈕的元件**（例如 `PageFab`、`DetailField`）一律以 `useRunAction()` 取得執行函數，不直接呼叫 `onClick`，確認框與錯誤提示才會生效。不在 `AppShell` 之下時，改為直接執行

---

## 內建 builder 一覽

內建 builder 皆為一般函數，位於 `composables/actions/useTableActions.ts`：接收當時的值（表、該列、選取的 id），回傳一個 `PageAction`，不適用時回傳 `null`。

外觀與行為分開傳入：
- 有預設外觀的 builder，最後一個參數一律為 `look`（`ActionLook`，`{ label?, icon? }`）。省略時使用預設的文字與圖示
- 行為的設定（`newAction` 的 `{ defaults, lockId }`、刪除的 `onDone`）放在 `look` 之前。只更換外觀時，該參數傳入 `{}` 或 `undefined`
- `quickEditAction` 與 `setFieldAction` 沒有預設外觀：`label` 與 `icon` 為必填，與其他設定放在同一個物件中

| 函數 | 回傳 | 說明 |
| --- | --- | --- |
| `newAction(table, { defaults?, lockId? }?, look?)` | `PageAction` | 開啟新增表單（見 [pages.md](pages.md#表單層)）。`defaults` 可為值、ref 或 getter，於按下時求值。`lockId` 使主鍵唯讀，主鍵只能由 `defaults` 帶入 |
| `editAction(table, row, look?)` | `PageAction` | 開啟該列的編輯表單 |
| `copyAction(table, row, look?)` | `PageAction \| null` | 確認後複製該列：主鍵重新發號，其餘真實欄位照抄，完成後前往新的一列。子列不複製。表沒有 `newId` 時為 `null` |
| `deleteAction(table, row, onDone?, look?)` | `PageAction` | 確認後刪除該列，包括 cascade 的子列，完成後呼叫 `onDone`。刪除的是目前詳細頁顯示的那一列時，自動以 `leaveAfterAction` 離開 |
| `bulkDeleteAction(table, ids, onDone?, look?)` | `PageAction \| null` | 確認後刪除選取的各列，完成後呼叫 `onDone`，列表頁以此清除選取。未選取任何一列時為 `null` |
| `quickEditAction(table, keys, ids, { label, icon, key?, defaults?, onDone? })` | `PageAction \| null` | 以對話框詢問 `keys` 中的欄位，將選取的各列改為同一個值。未選取任何一列時為 `null`（見「快速編輯對話框」） |
| `goToRefAction(row, key, refTable, look?)` | `PageAction \| null` | 前往 ref 欄位指向的父列。欄位為空時為 `null` |
| `openUrlAction(row, key, look?)` | `PageAction \| null` | 以新分頁開啟該欄的網址。值不是 http(s) 網址時為 `null` |
| `setFieldAction(table, row, key, value, { label, icon, confirm? })` | `PageAction` | 立即將該欄改為 `value()`。`value` 為函數，於按下時求值，例如 `() => new Date()` |

交給 FAB、App Bar 等位置的動作須隨資料更新，以下列兩個函數包裝：

| 函數 | 回傳 | 說明 |
| --- | --- | --- |
| `useAction(build)` | `ComputedRef<PageAction \| null>` | 供各表的 `use表名Actions` 使用。`build` 回傳一個動作或 `null`，資料變更時重新求值 |
| `useRowAction(row, build)` | `ComputedRef<PageAction \| null>` | 供詳細頁使用，將以列為參數的動作綁定至目前那一列。`row` 為 Ref。尚未載入時為 `null`，載入後以該列呼叫 `build` |

欄位動作與列上的動作直接以該列呼叫，無須包裝。

---

## 各表的 use表名Actions

每張表的動作一律從 `use表名Actions(options)` 取得，範本為 [template/table/use__Table__Actions.ts](../../template/table/use__Table__Actions.ts)。

- **呼叫端只提供自身具備的參數**：列表頁提供 `selectedIds`、`onDone`。須設定新增的預設值時，提供 `defaults`。用不到的動作為 `null`
- **回傳物件包含兩種項目**：
  - 不以列為參數的動作（`new`、`bulkDelete`）已以 `useAction` 包裝，型別為 `ComputedRef<PageAction | null>`，可直接交給位置
  - 以列為參數的動作（`edit`、`delete`）為接收一列並回傳動作的函數。詳細頁以 `useRowAction` 綁定至目前那一列。列表於 view 的 `actions` 中直接以該列呼叫（見「列上的動作」）。`fieldActions` 也以一列呼叫
- **自訂的動作**（包括連續動作）也定義於此：不以列為參數的，以 `useAction(() => ({ … }))` 包裝。以列為參數的，寫成 `(row) => …`。範本回傳物件的末尾附有連續動作的示範
- **一個位置放置哪些動作，由頁面決定**：頁面取出需要的動作，組成陣列交給該位置
- **動作屬於其所在資料的那張表**（對照 AppSheet）：
  - 詳細頁本身的 FAB、App Bar 與欄位動作，屬於這一頁的表
  - 子表區塊與子表列表中的動作（例如「新增」）屬於子表，以子表的 `use表名Actions` 帶入父列的預設值
- **一張表的 `use表名Actions` 不呼叫其他表的 `use表名Actions`**：須對其他表操作時（例如從訂單的詳細頁，為它的第一列明細新增出貨單），以內建 builder（例如 `newAction`）在自己的 `use表名Actions` 中組出，透過 ref 的 getter 讀取所需的資料

取用方式見範本：

- **詳細頁**（`template/pages/detail.vue`）：以 `useRowAction` 將 `edit`、`delete` 綁定至目前那一列。編輯交給 `DetailPage` 的 `fab`，刪除以 `useAppBarActions` 放上 App Bar，`fieldActions` 交給 `DetailPage`
- **列表頁**（`template/pages/list.vue`）：傳入多選的 `selectedIds` 與 `onDone`。新增交給 `ListPage` 的 `fab`，刪除選取的列以 `useAppBarActions` 放上 App Bar
- **列上的動作**（`template/pages/profile-list.vue` 等）：於 view 的 `actions` 中以該列呼叫（見「列上的動作」）

`delete` 為 JavaScript 的保留字，解構時須改名，例如 `remove`。

---

## 欄位動作

詳細頁欄位右側的動作由 `fieldActions` 決定，型別為 `FieldActions<Row>`：欄位 key → `(row) => PageAction | null`，每一欄一個。`DataDetail` 以目前那一列呼叫，回傳 `null` 時該欄沒有動作。

```ts
const fieldActions: FieldActions<__Table__Row> = {
  parent: row => goToRefAction(row, 'parent', 'parent'),
  date: row => setFieldAction('__table__', row, 'date', () => new Date(), { label: '改成今天', icon: mdiCalendarToday }),
}
```

- **欄位動作不是內建的**：前往 ref 的父列、開啟網址、改為今天，同樣是 builder，須使用時才列入

---

## 列上的動作

每一列的動作與欄位一起定義於 view（見 [DataList](../components/list/DataList.md) 的「view」）：從 `use表名Actions` 取出以列為參數的動作，於 view 的 `actions` 中以該列呼叫，回傳動作的陣列。範本見 `template/pages/profile-list.vue`、`gallery-list.vue`，左右各兩格的寫法見 `card-list.vue`。

- **陣列依位置排列，`null` 表示空位**：
  - card 與詳細頁標頭的前兩個置於左側，後兩個置於右側。deck、profile 與 gallery 略過空位
  - builder 判斷不適用而回傳的 `null` 也依此處理：card 與詳細頁標頭保留該格，deck、profile 與 gallery 略過
- **`display`** 決定該動作顯示為圖示或文字
- **deck**：由 [ViewActions](../components/view/ViewActions.md) 呈現於右下角欄位的下一行，由左往右排列，整組靠右。沒有動作時不佔高度。多選模式下隱藏。按鈕與整列的連結並列，不包在連結中，點擊按鈕不進入詳細頁
- **profile**：由 ViewActions 的 `variant="menu"` 收入卡片右側的 ⋮ 選單，只有一個動作時也收入選單。沒有動作時不顯示 ⋮。多選模式下隱藏。⋮ 與卡片的連結並列，點擊 ⋮ 不進入詳細頁（見 [DataProfile](../components/list/DataProfile.md)）
- **gallery**：與 profile 相同，收入 ⋮ 選單，置於格子的右下角（見 [DataGallery](../components/list/DataGallery.md)）
- **card**：由 ViewActions 的 `variant="slots"` 呈現於第 4 層，前兩格靠左，後兩格靠右，`null` 保留為空格，第五個以後不顯示。四格皆為 `null` 時整層隱藏。多選模式下隱藏。點擊按鈕不進入詳細頁，按鈕之間的空白處仍屬於連結（見 [DataCard](../components/list/DataCard.md)）
- **詳細頁的標頭**：與 card 相同，由 ViewActions 的 `variant="slots"` 呈現於標頭圖片（或文字）的下方。標頭於資料載入後才顯示，`row` 必定存在，因此直接呼叫以列為參數的動作，無須經過 `useRowAction`（見 [DetailHeader](../components/record/DetailHeader.md)）

---

## 連續動作（流程）

多個步驟須一次完成時（例如新增父列後直接進入它的詳細頁，或接著新增子列），以 `useFlow` 串成一段 async 程式，整段包成一個動作：
- 動作的 `onClick` 呼叫 `runFlow`
- `runFlow` 中依序 `await runStep(…)`，開啟各張表單，並取回建立的列
- 最後換頁

範本見 `template/table/use__Table__Actions.ts` 末尾的 `newWithChild`，位於註解中。

- **`runStep(table, options?)`**：開啟一張表單，等待送出成功，取回建立或修改的列。`options` 與 `openForm` 相同（見 [pages.md](pages.md#表單層)）。第一步佔 history 的一格，之後的步驟取代同一格
- **表單無須修改**：步驟的表單與一般的表單相同，只有關閉時保留 history 的那一格
- **離開步驟的表單層即視為放棄**：取消、返回鍵與前往其他頁面皆是。等待中的步驟拋出 `FlowCancelled`，`runFlow` 接到後呼叫 `rollbackFlow()`，一次還原整條流程對快取與佇列的修改
- **流程的程式拋出錯誤時**（不是取消），也執行 rollback，另以 snackbar 回報錯誤，並離開保留的那一格
- **流程進行中不能推送**：`flush()` 拒絕執行。表單開啟時，同步按鈕也停用（見 [store.md](store.md)）
- **流程定義於起點那張表**的 `use表名Actions` 中，跨表的流程也是如此
- **流程不能套疊**：第二個 `beginFlow` 直接拋出錯誤
- **中途離開時的確認**（第二步之後一律詢問），見 [pages.md](pages.md#離開表單前的詢問)

流程的程式只有一條規則：**只以 `runStep` 開啟表單。** 結尾可以前往其他頁面。沒有時回到發起流程的頁面。

### 步驟的三種型態

只有第一種須使用上述機制：

| 種類 | 例子 | 須使用 |
| --- | --- | --- |
| 導覽型 | 開啟新增或編輯表單 | `runStep`：預設值與結果皆經由一般的參數與回傳值傳遞 |
| 對話框型 | 選擇日期的小視窗 | `askFields`：一個一般的 promise，確定時 resolve，取消時為 `null` |
| 立即型 | 日期改成今天 | 無須其他機制，即一次 `store.update` |

---

## 快速編輯對話框

只須修改一兩欄、不值得開啟整頁表單時使用，例如修改狀態、補上日期、多列改成同一個值。對話框只詢問那幾欄，按確定才寫入：

```ts
const values = await askFields<Row>(schema, ['status'], { rows: [current] })
if (values) {
  store.update(table, current.id, values)
}
```

- 回傳 `Promise<Partial<Row> | null>`，取消時為 `null`。此函數獨立於流程，也可在流程中作為一步使用
- 內容為 `DataForm` 加上 `only` prop，只顯示那幾欄：輸入元件、驗證、錯誤顯示皆沿用。驗證只檢查被詢問的欄位。提供 `options.rows` 時，主鍵欄唯讀
- **初始值的三層規則**：
  1. `options.rows` 恰好一列，且該欄有值時，使用目前的值
  2. 否則使用 `options.defaults[key]`，可為值或函數
  3. 兩者皆無時為空
  - **不套用 schema 的 `default`**。多列時不顯示目前的值
- 通用的用法包裝為 `quickEditAction(table, keys, ids, { label, icon, defaults, onDone })`：
  - 未選取任何一列時回傳 `null`，因此只在多選模式下出現
  - 確定後，對每個 id 各執行一次 `store.update`，不另外新增操作的種類
- 對話框是對話框大小的表單層（見 [pages.md](pages.md#表單層)）：返回鍵與點選外側皆只關閉對話框，並回傳 `null`
- 只須詢問是或否時，使用 `confirm(title, text): Promise<boolean>`。動作的 `confirm` 宣告與離開守衛都使用此函數
- 須提供兩個以上的去向時，使用 `choose(title, text, choices): Promise<string | null>`，與 `confirm` 共用同一個對話框實例（見 [ConfirmDialog.md](../components/dialog/ConfirmDialog.md)）
- 一次要詢問的欄位，放在同一個對話框中
