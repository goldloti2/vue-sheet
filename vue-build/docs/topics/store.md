# 資料流與共用快取

資料從哪裡來、改動怎麼累積、什麼時候真的寫進 Sheet。

> **前置**：先看過 [schema.md](schema.md)（這裡的型別轉換與 row 上的 getter 都由 schema 決定）。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../../ROADMAP.md)。

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
- **關聯的表會一起載**（ref 指到的父表、指向它的子表）
- **沒有「只重抓一張表」的 API**。要重抓就是整個 App 一起（同步鈕）

---

## 寫入

一律走 store 的四個 action，**不要在頁面或元件裡直接呼叫 `mutateBatch`**：

```ts
store.create(table, values)      // 回傳新建那筆（id 當場發），並 push 進快取
store.update(table, id, values)  // 回傳更新後那筆；values 可以只給幾欄
store.remove(table, id)          // 從快取移除
store.removeMany(table, ids)     // 從快取移除多筆
```

**這四個都是同步的**——只動快取與待推送佇列，不碰網路。真正送出去是 `flush()` 的事，由使用者按推送鈕觸發。

一般頁面連這四個都用不到：新增／編輯用 `useCreateForm`／`useEditForm`，刪除用 `deleteAction`／`bulkDeleteAction`，內部都接好了。

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

- **表單一律送整列**（不做最小差集）

### 新增的 id 由前端決定

`store.create` 以主鍵那一欄的值為 id；空的才呼叫 schema 的 `newId()` 發號並填回該欄，不等後端回傳（主鍵的規則見 [schema.md](schema.md#主鍵)）。怎麼發是每張表自己的事——框架只提供現成的 `prefixedId('TPL')`（前綴 + 8 碼十六進位隨機值，例如 `TPL-11eef1a8`），要日期編號或流水號就自己寫一個 `() => string`（格式不以數字開頭）。

- **`create` 寫入前檢查 id**：快取中已有同一個 id，或同一個 id 有尚未推送的刪除時，拋錯且不動快取與佇列
- **`update` 不改主鍵**：`values` 帶了主鍵且值與原本不同時拋錯；值相同時略過該欄，不寫回 Sheet

`create` 的語意是「id 不存在就建、已存在就當作已完成」。後端仍須阻擋重複的 id。

---

## 推送與同步

**推送**（`flush()`）把整個佇列攤平成一串操作，**跨所有表共用一個請求**。

```ts
mutateBatch([
  { table: 'order', kind: 'update', id: 'ORD-1', values: { 下單日期: '2026/10/01' } },
  { table: 'child', kind: 'create', id: 'CHD-9', values: { … } },
  { table: 'child', kind: 'delete', id: 'CHD-3' },
])
```

- **全有全無**：後端在鎖裡跑完整批，中途失敗就什麼都不寫。成功才清空佇列，失敗佇列原封不動，使用者再按一次就是整批重送
- **`update` 只送進佇列的那幾欄**，不是整列：表單送的是整列（上面「不做最小差集」那條），但快速編輯、欄位動作（例如「下單日期改成今天」）只有那一欄；同一筆的多次編輯合併成聯集。後端只寫 payload 裡的那幾格，所以**沒進過佇列的欄位保留 Sheet 上手改的值與公式**。衝突檢查以檔案層級的 `modifiedTime` 進行，無法分辨哪一欄被修改
- **不回傳資料列**
- **不往外拋**，錯誤記在 `store.flushError`，回傳這一次成不成功
- **推送中又被呼叫就共用同一個 promise**（跟 `load()` 一樣），兩邊等到同一個結果

### 衝突：Sheet 被別處改過

每次讀取都記下整個檔案的 `modifiedTime`，推送時當 `since` 一起送；後端在同一把鎖裡比對，對不上就**什麼都不寫**、回 `error: 'modified'`（前端拿到 `ConflictError`）。

衝突時佇列**原封不動**，`store.conflict` 立起來，`AppShell` 用 `choose()` 問兩條出路：

| 選擇 | 做什麼 |
| --- | --- |
| **放棄並重抓** | `store.discardAndReload()`：丟掉未推送的變更，重抓所有已載入與載入失敗的表（Sheet 上那份當真相） |
| **強制推送** | `store.forcePush()`：不帶 `since` 再送一次。蓋掉的只有進過佇列的那幾欄，其餘保留 Sheet 上的值 |
| 關掉對話框 | 什麼都不做，佇列留著，下次按同步再問 |

> 假後端是純記憶體的，同一個分頁不可能自己產生衝突。開發時在 console 叫 `mockTouch()` 可以模擬「別人改了 Sheet」，下一次推送就會撞到衝突（只在 dev 模式掛上去）。
>
> 啟用登入時，後端回 token 過期或無效，store 的 `error` 與 `flushError` 會帶著那句訊息，同時 router 把畫面帶到登入頁；重新登入後 `store.reload()` 重抓已載入與載入失敗的表（跟同步鈕重抓的範圍一樣，但不推送），佇列則等使用者按同步（見 [docs/auth.md](../../../docs/auth.md)）。
>
> 推送與讀取的 payload 在 dev 模式會印進 console（`[api] → / ← / ✗`，`console.debug` 層級），真後端與假後端都印，所以兩邊對不起來的時候可以直接比對。

**同步鈕**固定放在 App Bar 最右側，做的是 `store.refresh()`＝**先推送再重抓所有已載入的表**（推送失敗時不重抓）。重抓的範圍也包含**載入失敗、還沒有資料的表**。

- 平常一律可按
- `store.hasPending` 為真時圖示右下角加一個圓點：未推送是 `warning` 色、上次推送失敗轉 `error` 色
- **它不經由 `useAppBarActions`**
- **表單開著時停用**（`store.canSync`）：`useCreateForm`／`useEditForm` 內部呼叫 `useSyncHold`，頁面活著的期間持有一個 `holdSync()`，離開時釋放。持有是計數器，同時開幾張都對
- 佇列只存於記憶體中；有未推送變更時，`beforeunload` 會攔下關閉與重新整理

---

## 流程存檔點

給[連續動作](actions.md#連續動作流程)用的：中途取消要整條流程一起取消，但不能動到跟流程無關的待推送變更。

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

**不做離線寫入。**
