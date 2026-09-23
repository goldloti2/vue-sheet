# CRUD API 與後端約定

前端與 Apps Script 後端之間的介面：前端已經照這裡寫（`vue-build/src/services/appScript.ts`），後端要照這裡實作。

> **標記說明**：沒有標記的段落＝已經實作、程式碼就是這樣。
> 🔶 部分實作、🔲 尚未實作（只是設計方向，程式碼裡還沒有）、✅ 用在被 🔶 段落包住、但本身已完成的小節。
> 詳細進度見 [ROADMAP.md](../ROADMAP.md)。

---

## CRUD API 設計決策

> 🔶 **部分實作。** 這一節是跟「還不存在的後端」之間的約定。目前只有 `services/mock/` 的假後端：action 名稱與「回傳異動到的那筆」的形狀已經照這裡實作，但 HTTP 那一層（doGet/doPost、`{ success }` 信封、`VITE_APPS_SCRIPT_URL`）都還沒接上——`services/types.ts` 的 `ApiResponse` 型別已定義但還沒有人使用。

---

## 請求與回應

- 讀取走 `doGet` + query string，寫入走 `doPost` + JSON body，body 帶 `action` 欄位。這是 Apps Script 只有 doGet/doPost 兩種入口所決定的，不是可選項
- action：`create`、`update`、`delete`（假後端另有 `bulkUpdate`，但前端的佇列一律逐筆送，快速編輯與批次刪除都拆成多個單筆操作，目前沒有人叫它）。完整介面與之後的 batch 端點見 ROADMAP「後端 API 介面」
- payload 裡的欄位值**由前端轉成 sheet 的形狀**（表頭當 key、值是字串）再送出，後端拿到什麼就寫什麼，不自己做型別轉換
- 保留字：`table`、`id`、`action` 不能拿來當篩選欄位名稱
- 回應統一包裝成 `{ success: true, data }` 或 `{ success: false, error: { message } }`
- **重要限制**：Apps Script Web App 無法自由設定 HTTP status code（幾乎都回 200），前端一律看 body 的 `success` 判斷成敗，不看 status
- 錯誤只回一句 `message`，不分類 error code（單人使用，看得懂就好）
- 部署後的網址放環境變數 `VITE_APPS_SCRIPT_URL`（`.env`，不進版控）

---

## 資料量

> ✅ **已實作。**

- 不做分頁，整表一次撈回（個人使用資料量不大，真的變慢再說）
- 排序、篩選、搜尋一律在前端對已抓回的資料處理，不在 API 層加參數

---

## 資料一致性

**驗證**：分工見 [vue-build/docs/schema.md](../vue-build/docs/schema.md)——合法性只在前端做（form 層與 store 寫入層都接了同一個 `validateRow`），後端只做安全性與結構完整性。目的不是防外部攻擊（那已經靠 Google 帳號擋掉了），而是防自己送出壞資料。

🔲 **多裝置同時編輯**（還沒做）：比對**整個試算表檔案**的 `modifiedTime`，不是逐筆的 `updatedAt`——Sheets 沒有逐列的修改時間，要維護就得後端戳章加 `onEdit` 觸發器。

- `fetchTable` 的回應帶 `modifiedTime`（`DriveApp.getFileById(id).getLastUpdated()`），前端記下來
- `mutateTable` 的 payload 帶 `since`，後端在 `LockService` 鎖裡跟當下的值比對再寫：不一致就回 `{ success: false, error: 'modified' }` 什麼都不寫，一致就寫入並回新的 `modifiedTime`
- 粒度很粗（任何分頁、連格式變更都算），單人多裝置的情境夠用。前端的處置見 [ROADMAP](../ROADMAP.md) 資料一致性段

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
