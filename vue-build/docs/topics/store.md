# 資料流與共用快取

資料的來源、改動的累積方式，以及實際寫入 Sheet 的時機。

> **前置**：先閱讀 [schema.md](schema.md)。此處的型別轉換與列上的 getter 皆由 schema 決定。

> **標記**：沒有標記表示已實作。🔶 為部分實作，🔲 為尚未實作。詳細進度見 [ROADMAP.md](../../../ROADMAP.md)。

---

## 讀取

同一張表在全 App 只抓取一次，共用一份。頁面不直接使用 store：

```ts
const { data, loading, error } = useSortedTableList<OrderRow>('order', orderSchema)  // 列表頁
const { row, loading, error } = useTableRow<OrderRow>('order', id)                   // 詳細頁
```

```
頁面 → useTableList / useSortedTableList / useTableRow
     → stores/tables（有快取就直接提供，沒有才抓取）
     → services/appScript.ts 的 fetchTable
     → 後端回傳原始字串 → coerceRow 依 schema 轉換型別 → 存入快取
```

- **型別轉換只發生在 `fetchTable` 這一處**：後端的形狀為 `Record<string, string>`，前端的形狀為已轉換型別的 Row（`Date`、`number`、`null`）
- **關聯的表一起載入**：ref 欄位指向的父表（虛擬的 ref 也包括在內），以及指向此表的子表
- **沒有「只重新抓取一張表」的 API**。重新抓取即整個 App 一起重新抓取，經由同步按鈕

---

## 寫入

寫入一律經過 store 的四個 action，**不在頁面或元件中直接呼叫 `mutateBatch`**：

```ts
store.create(table, values)      // 回傳新建的那一列（id 當場發號），並加入快取
store.update(table, id, values)  // 回傳更新後的那一列，values 可以只含幾欄
store.remove(table, id)          // 從快取移除
store.removeMany(table, ids)     // 從快取移除多列
```

**這四個 action 皆為同步**：只修改快取與待推送佇列，不使用網路。實際送出由 `flush()` 負責，在使用者按下同步按鈕時觸發。

一般頁面連這四個 action 都用不到：新增與編輯使用 `useCreateForm`、`useEditForm`，刪除使用 `deleteAction`、`bulkDeleteAction`，內部皆已接好。

### 三個結構各管一件事

| | 存放的內容 | 讀取者 |
| --- | --- | --- |
| `rows` | 畫面上看到的資料。已送出的、尚未送出的、流程建立的，全部混在一起 | 畫面 |
| `pending` | 尚未寫入後端的變更，鍵為 (表, id) | `flush` |
| `activeFlow` | 流程碰過的每張表**在被碰之前**的狀態 | 回滾 |

- **`rows` 為 `shallowReactive`**：寫入一律替換整條陣列，不就地修改某一列。因此繞過 store 直接修改 `store.rows` 中的欄位，不會觸發畫面更新
- **`pending` 存放「要送出的形狀」**：進入佇列時即以 `serializeRow` 轉換好，以 Sheet 的表頭為 key，值為字串。`flush` 取出後直接送出
- **同一列的多次操作在寫入時即合併**，不留到 flush 才計算：

  | 先 | 後 | 結果 |
  | --- | --- | --- |
  | `update` | `update` | 合併為一次 |
  | `create` | `update` | 併入那個 `create` |
  | `create` | `delete` | 整組移除，無須送出 |
  | `update` | `delete` | 只保留 `delete` |

- **表單一律送出整列**，不計算最小差集

### 新增的 id 由前端決定

`store.create` 以主鍵欄的值為 id。值為空時，才呼叫 schema 的 `newId()` 發號並填回該欄，不等待後端回傳。主鍵的規則見 [schema.md](schema.md#主鍵)。

發號的方式由每張表自行決定：
- 框架只提供現成的 `prefixedId('TPL')`：前綴加上 8 碼十六進位的隨機值，例如 `TPL-11eef1a8`
- 須以日期編號或流水號時，自行撰寫一個 `() => string`，格式不以數字開頭

寫入時的檢查：
- **`create` 寫入前檢查 id**：快取中已有同一個 id，或同一個 id 有尚未推送的刪除時，拋出錯誤，不修改快取與佇列
- **`update` 不修改主鍵**：`values` 含主鍵且值與原本不同時，拋出錯誤。值相同時略過該欄，不寫回 Sheet

`create` 的語意為「id 不存在就建立，已存在就視為已完成」。後端仍須阻擋重複的 id。

---

## 推送與同步

**推送**（`flush()`）把整個佇列攤平成一串操作，**所有表共用一個請求**。

```ts
mutateBatch([
  { table: 'order', kind: 'update', id: 'ORD-1', values: { 下單日期: '2026/10/01' } },
  { table: 'child', kind: 'create', id: 'CHD-9', values: { … } },
  { table: 'child', kind: 'delete', id: 'CHD-3' },
])
```

- **全有全無**：後端在鎖中執行完整批操作，中途失敗即全部不寫入。成功才清空佇列。失敗時佇列不變，使用者再按一次即整批重送
- **`update` 只送出進入佇列的那幾欄**，不是整列：
  - 表單送出整列，見上方「不計算最小差集」
  - 快速編輯與欄位動作（例如「下單日期改成今天」）只有那一欄。同一列的多次編輯合併為聯集
  - 後端只寫入 payload 中的那幾格，因此**未進入佇列的欄位，保留 Sheet 上手動修改的值與公式**
  - 衝突檢查以檔案層級的 `modifiedTime` 進行，無法分辨哪一欄被修改
- **不回傳資料列**
- **不向外拋出錯誤**：錯誤記錄於 `store.flushError`，回傳值表示這一次是否成功
- **推送中再次被呼叫時，共用同一個 promise**，與 `load()` 相同。兩個呼叫者等到同一個結果

### 衝突：Sheet 被別處修改

每次讀取時記下整個檔案的 `modifiedTime`，推送時以 `since` 一併送出。後端在同一把鎖中比對，不相符時**全部不寫入**，回傳 `error: 'modified'`，前端取得 `ConflictError`。

衝突時佇列**不變**，`store.conflict` 設為真，`AppShell` 以 `choose()` 詢問使用者：

| 選擇 | 結果 |
| --- | --- |
| **放棄並重新抓取** | `store.discardAndReload()`：丟棄未推送的變更，重新抓取所有已載入與載入失敗的表，以 Sheet 上的資料為準 |
| **強制推送** | `store.forcePush()`：不帶 `since` 再送一次。只覆蓋進入佇列的那幾欄，其餘欄保留 Sheet 上的值 |
| 關閉對話框 | 不做任何事，佇列保留，下次按同步時再詢問 |

> 假後端為純記憶體，同一個分頁不可能自行產生衝突。開發時於 console 呼叫 `mockTouch()`，可模擬「別人修改了 Sheet」，下一次推送即遇到衝突。此函數只在開發模式下掛上。
>
> 啟用登入時，後端回傳 token 過期或無效：
> - store 的 `error` 與 `flushError` 帶有該訊息，router 同時把畫面帶到登入頁
> - 重新登入後，`store.reload()` 重新抓取已載入與載入失敗的表，範圍與同步按鈕的重新抓取相同，但不推送
> - 佇列等待使用者按同步（見 [docs/auth.md](../../../docs/auth.md)）
>
> 推送與讀取的 payload 在開發模式下印至 console（`[api] → / ← / ✗`，`console.debug` 層級）。真後端與假後端都印出，兩邊不一致時可直接比對。

**同步按鈕**固定置於 App Bar 最右側，執行 `store.refresh()`：**先推送，再重新抓取所有已載入的表**，推送失敗時不重新抓取。重新抓取的範圍也包括**載入失敗、尚無資料的表**。

- 平時一律可按
- `store.hasPending` 為真時，圖示右下角加一個圓點：有未推送的變更時為 `warning` 色，上次推送失敗時為 `error` 色
- **同步按鈕不經過 `useAppBarActions`**
- **表單層開啟時停用**（`store.canSync`）：`useFormLayers` 於有任何層時持有一個 `holdSync()`，全部關閉時釋放。持有以計數器實作
- 佇列只存於記憶體中。有未推送的變更時，`beforeunload` 攔下關閉與重新整理

---

## 流程存檔點

供[連續動作](actions.md#連續動作流程)使用：中途取消時，整條流程一起取消，但不影響與流程無關的待推送變更。

```ts
store.beginFlow()     // 建立存檔點
store.rollbackFlow()  // 一次還原快取與佇列
store.commitFlow()    // 丟棄存檔點，變更留在佇列中等待推送
```

建立存檔點之後，每張被碰到的表在改動前保留一份原值（快取的陣列與佇列的 Map）。同一張表只保留第一次的原值。

**例**：佇列已有 A、B、C，流程建立了 P，又修改了 B。取消後，佇列回到 A、B、C：B 為流程碰之前的值，不是被刪除。P 則在快取與佇列中都消失，從頭到尾沒有送出過。

---

## 離線可用性

> 🔲 **尚未實作。** 尚未安裝 `vite-plugin-pwa`，manifest 與 Service Worker 都尚未建立，App 圖示也尚未決定。

只做基本的 PWA 安裝殼層快取：
- Service Worker 只快取靜態資源，使 App 可安裝、開啟時立即有畫面
- 資料仍即時呼叫 API。沒有網路時，列表顯示「無法連線」

**不做離線寫入。**
