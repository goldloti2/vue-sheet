# CRUD API 與後端約定

前端與 Apps Script 後端之間的介面：前端已經照這裡寫（`vue-build/src/services/appScript.ts`），後端要照這裡實作。

> **標記說明**：沒有標記的段落＝已經實作、程式碼就是這樣。
> 🔶 部分實作、🔲 尚未實作（只是設計方向，程式碼裡還沒有）、✅ 用在被 🔶 段落包住、但本身已完成的小節。
> 詳細進度見 [ROADMAP.md](../ROADMAP.md)。

---

## CRUD API 設計決策

> 🔶 **前端全部做好了，等後端。** `appScript.ts` 已經有真的 `fetch`（GET 讀整張表、POST 送 batch、拆 `{ success }` 信封、認衝突），**`VITE_APPS_SCRIPT_URL` 沒設就自動走 `services/mock/` 的假後端**——兩邊回傳的形狀一樣，所以上線只是在 `.env` 填一個網址。還沒驗證過的只有「真的對著 Apps Script 打」這件事。

---

## 請求與回應

- 讀取走 `doGet` + query string，寫入走 `doPost` + JSON body。這是 Apps Script 只有 doGet/doPost 兩種入口所決定的，不是可選項
- **寫入只有一個 batch 端點**：body 帶 `operations: [{ table, kind, id, values? }, …]`，`kind` 是 `create`／`update`／`delete`。一個請求帶所有表的所有操作——要省的是每次請求的 script 冷啟（0.5～2 秒），不是配額
- **全有全無**：後端在 `LockService` 鎖裡跑完整批，中途失敗就什麼都不寫。前端保留佇列，使用者重按就是整批重送（`create` 定義成冪等的，所以安全）
- **不回傳資料列**：前端寫入當下就改好自己的快取了，推送成功後本來就會重抓整表。完整介面見 ROADMAP「後端 API 介面」
- **`update` 的 `values` 只有改過的那幾欄**，後端在鎖裡讀現值、合併、寫整列，所以同一列上沒動過的欄位保留 Sheet 上手改的值
- payload 裡的欄位值**由前端轉成 sheet 的形狀**（表頭當 key、值是字串）再送出，後端拿到什麼就寫什麼，不自己做型別轉換
- 保留字：`table`、`id`、`kind` 不能拿來當欄位名稱
- 回應統一包裝成 `{ success: true, data }` 或 `{ success: false, error: { message, code? } }`。batch 成功時的 `data` 是 `{ modifiedTime }`
- **重要限制**：Apps Script Web App 無法自由設定 HTTP status code（幾乎都回 200），前端一律看 body 的 `success` 判斷成敗，不看 status
- 錯誤只回一句 `message`，不分類 error code——**唯一的例外是 `code: 'modified'`**，衝突要能被前端認出來才問得了使用者
- **POST 的 `Content-Type` 要是 `text/plain`**，不是 `application/json`：後者會觸發 CORS 預檢（`OPTIONS`），而 Apps Script 的 Web App 回不了預檢。後端用 `JSON.parse(e.postData.contents)` 讀 body，內容仍然是 JSON
- 部署後的網址放環境變數 `VITE_APPS_SCRIPT_URL`（`.env`，不進版控；範本見 `.env.example`）。**沒設就走假後端**，所以 clone 下來不填任何東西就能跑

---

## 資料量

> ✅ **已實作。**

- 不做分頁，整表一次撈回（個人使用資料量不大，真的變慢再說）
- 排序、篩選、搜尋一律在前端對已抓回的資料處理，不在 API 層加參數

---

## 資料一致性

**驗證**：分工見 [vue-build/docs/schema.md](../vue-build/docs/schema.md)——合法性只在前端做（form 層與 store 寫入層都接了同一個 `validateRow`），後端只做安全性與結構完整性。目的不是防外部攻擊（那已經靠 Google 帳號擋掉了），而是防自己送出壞資料。

🔶 **多裝置同時編輯**：**前端已經做好、等後端實作**。比對**整個試算表檔案**的 `modifiedTime`，不是逐筆的 `updatedAt`——Sheets 沒有逐列的修改時間，要維護就得後端戳章加 `onEdit` 觸發器。

- `fetchTable` 的回應帶 `modifiedTime`（`DriveApp.getFileById(id).getLastUpdated()`），前端記下來
- batch 的 payload 帶 `since`，後端在 `LockService` 鎖裡跟當下的值比對再寫（跟全有全無同一把鎖）：不一致就回 `{ success: false, error: 'modified' }` 什麼都不寫，一致就寫入並回新的 `modifiedTime`
- **`since` 沒帶就是強制推送**：不比對、直接寫。前端的「強制推送」就是這樣送的
- 粒度很粗（任何分頁、連格式變更都算），單人多裝置的情境夠用。前端撞到衝突後的處置（保留佇列、兩條出路）見 [vue-build/docs/store.md](../vue-build/docs/store.md) 的推送那節

> `id` 是每張表都有的系統欄位，由後端統一處理，個別 Schema 不列出。前端 `TableSchema` 比照辦理：用獨立的 `idColumn` 指出 ID 對應的表頭，不放進 `columns`；`coerceRow()` 固定把它轉成 row 物件的 `id`。

---

## 後端客製邏輯擴充點（Hooks）

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

## 認證與權限

> 🔲 **尚未實作。** 後端還沒部署，這裡記的是部署時要怎麼設定。

單人使用，用 Google 帳號判斷是不是本人在操作（不是為了取得 Sheets API scope）：Apps Script 部署 Web App 時「Who has access」設為「Only myself」。Google 在程式碼執行前就完成把關，未登入正確帳號者會被導向 Google 登入頁。

注意：前端 `fetch()` 在未登入時，因跨網域重導至 `accounts.google.com`，拿到的通常是網路層級錯誤而不是乾淨的 401 JSON。對單人自用裝置這個限制感受不明顯。
