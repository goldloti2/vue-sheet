# 資料流與共用快取

資料從哪裡來、改動怎麼累積、什麼時候真的寫進 Sheet。

> **前置**：先看過 [schema.md](schema.md)（這裡的型別轉換與 row 上的 getter 都由 schema 決定）。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../ROADMAP.md)。

---

## 讀取

同一張表全 App 只抓一次，共用一份。頁面不直接碰 store：

```ts
const { data, loading, error } = useSortedTableList<OrderRow>('order', orderSchema)  // 列表頁
const { row, loading, error } = useTableRow<OrderRow>('order', id)                   // 詳細頁
```

```
頁面 → useTableList / useSortedTableList / useTableRow
     → stores/tables（有快取就直接給，沒有才抓）
     → services/appScript.ts 的 fetchTable
     → 後端回原始字串 → coerceRow 依 schema 轉型別 → 存進快取
```

- **型別轉換只發生在 `fetchTable` 這一個點**：後端形狀是 `Record<string, string>`，前端形狀是轉好型別的 Row（`Date`／`number`／`null`）
- **關聯的表會一起載**（ref 指到的父表、指向它的子表），row 上的 getter 才有東西讀
- **沒有「只重抓一張表」的 API**。store 自己會把快取補好，頁面沒有需要自己補資料的時機；要重抓就是整個 App 一起（同步鈕）

---

## 寫入

一律走 store 的四個 action，**不要在頁面或元件裡直接呼叫 `mutateTable`**：

```ts
store.create(table, values)      // 回傳新建那筆（id 當場發），並 push 進快取
store.update(table, id, values)  // 回傳更新後那筆；values 可以只給幾欄
store.remove(table, id)          // 從快取移除
store.removeMany(table, ids)     // 從快取移除多筆
```

**這四個都是同步的**——只動快取與待推送佇列，不碰網路。真正送出去是 `flush()` 的事，由使用者按推送鈕觸發。

一般頁面連這四個都用不到：新增／編輯用 `useCreateForm`／`useEditForm`，刪除用 `useDeleteAction`／`useBulkDeleteAction`，內部都接好了。

### 三個結構各管一件事

| | 存什麼 | 誰讀 |
| --- | --- | --- |
| `rows` | 畫面看到的資料。已送出的、沒送出的、流程建的全混在一起 | 畫面 |
| `pending` | 還沒寫到後端的那批，鍵是 (表, id) | `flush` |
| `activeFlow` | 流程碰過的每張表**在被碰之前**的樣子 | 回滾 |

- **`rows` 是 `shallowReactive`**：寫入一律整條陣列換掉、不就地改某一列。反過來說，繞過 store 直接改 `store.rows` 裡的欄位不會觸發畫面更新
- **`pending` 存的是「要送出去的形狀」**：進佇列的當下就用 `serializeRow` 轉好（Sheet 表頭當 key、值是字串），`flush` 拿了就送
- **同一筆的多次操作在寫入當下就合併**，不是留到 flush 才算：

  | 先 | 後 | 結果 |
  | --- | --- | --- |
  | `update` | `update` | 併成一次 |
  | `create` | `update` | 併進那個 `create` |
  | `create` | `delete` | 整組移除，根本不用送 |
  | `update` | `delete` | 只留 `delete` |

- **表單一律送整列**（不做最小差集）：payload 大一點，但省掉在表單裡比對原始值的複雜度

### 新增的 id 由前端發

`store.create` 呼叫 schema 的 `newId()`，不等後端回傳。怎麼發是每張表自己的事——框架只提供現成的 `prefixedId('TPL')`（前綴 + 8 碼十六進位隨機值，例如 `TPL-11eef1a8`），要日期編號或流水號就自己寫一個 `() => string`。

這讓重送變成安全的：`create` 的語意是「id 不存在就建、已存在就當作已完成」，整批重送不需要記錄哪幾筆成功過。後端仍然要擋重複 id——Sheet 可以手動打開來改。

---

## 推送與同步

**推送**（`flush()`）逐筆送出佇列，成功一筆就移掉一筆。

- **失敗不還原**：已經送出的就是送出了，剩下的留在佇列裡等使用者再按一次
- **不往外拋**，錯誤記在 `store.flushError`，回傳這一次成不成功
- **推送中又被呼叫就共用同一個 promise**（跟 `load()` 一樣），兩邊等到同一個結果

**同步鈕**固定放在 App Bar 最右側，做的是 `store.refresh()`＝**先推送再重抓所有已載入的表**（推不出去就不重抓，否則會無聲蓋掉未推送的變更）。

- 因為它同時也是重新整理，所以平常永遠可按
- `store.hasPending` 為真時圖示右下角加一個圓點：未推送是 `warning` 色、上次推送失敗轉 `error` 色
- **它不走 `useAppBarActions`**——那條管道是給頁面註冊動作的，混進去會把頁面動作擠進 ⋮ 選單
- **表單開著時停用**（`store.canSync`）：`useCreateForm`／`useEditForm` 內部呼叫 `useSyncHold`，頁面活著的期間持有一個 `holdSync()`，離開時釋放。持有是計數器，同時開幾張都對
- 有未推送變更時 `beforeunload` 會攔一下關閉／重整，因為佇列只在記憶體裡

---

## 流程存檔點

給[連續動作](architecture.md#連續動作流程)用的：中途取消要整條流程一起取消，但不能動到跟流程無關的待推送變更。

```ts
store.beginFlow()     // 開存檔點
store.rollbackFlow()  // 一次還原快取與佇列
store.commitFlow()    // 丟掉存檔點，變更留在佇列裡等推送
```

開了之後，每張被碰到的表在改動前留一份原值（快取的陣列 + 佇列的 Map），同一張表只留第一次。

**例**：佇列已有 A、B、C，流程建了 P 又改了 B。取消後佇列回到 A、B、C——B 是流程碰之前的值、不是被刪掉，P 則兩邊都消失，從頭到尾沒送出過。

---

## 離線可用性

> 🔲 **尚未實作。** `vite-plugin-pwa` 沒安裝，manifest 與 Service Worker 都還沒建立，App 圖示也還沒決定。

只做基本 PWA 安裝殼層快取：Service Worker 只快取靜態資源（App 可安裝、開啟瞬間有畫面），資料仍即時打 API，無網路時列表顯示「無法連線」。

**不做離線寫入。** 之後有需求再加（需要 IndexedDB、寫入佇列、衝突處理一整套，成本明顯較高）。

---

## 設計取捨

**為什麼快取不分「已送出」與「未送出」**
畫面不該關心一筆送出去了沒——它只要顯示使用者眼中的現況。要分辨的是 `pending`，那是 flush 的事。跨表算出來的值（例如父表顯示子表的加總）因為讀的是同一份共用資料，會自動跟著重算，不需要任何跨表失效機制。

**為什麼佇列存序列化後的字串，而不是 `Partial<Row>`**
那本來就是要送給後端的形狀，flush 拿了就送；而且裡面沒有 `Date` 物件，哪天要存 `localStorage` 時 `JSON.stringify` 直接可用，不必回頭改資料結構。

**為什麼推送失敗不做補償**
id 由前端發，重送本來就是安全的（`create` 是冪等的），所以刻意不做「哪幾筆成功了」的記錄與還原。

**為什麼存檔點存整張表，而不是逐筆**
流程進行中沒有別的寫入者：使用者正在填表單，而 `flush()` 在流程進行中會被擋下（否則按了同步就把半成品推進 Sheet，之後想回滾也回滾不了——存檔點只動得了記憶體）。所以整張還原跟逐筆還原等價，但簡單很多：`patch` 本來就是整個陣列換掉，佇列的 `PendingOp` 也一律建新物件不就地改，淺層複製就夠。

**為什麼存檔點是隱式的（store 裡的環境狀態）**
流程期間的寫入不是連接器做的，是表單頁做的。`useCreateForm` 跟連接器隔著一次導覽、是不同的元件，拿不到顯式傳下去的交易物件（函式塞不進 `history.state`）。所以 `activeFlow` 放在 store 裡，`store.create`／`update` 自己去看。

**為什麼佇列不寫進 localStorage**
不持久化的代價是：重整、當機、分頁被系統殺掉就會丟掉未推送的變更，`beforeunload` 只擋得住主動關分頁。單人使用、推送就是一顆鈕，可接受；哪天要做的話怎麼做記在 [ROADMAP](../../ROADMAP.md) 的累積寫入段。
