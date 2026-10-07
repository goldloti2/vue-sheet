# CRUD API 與後端約定

前端與 Apps Script 後端之間的介面，兩端皆依此實作：前端在 `vue-build/src/services/appScript.ts`，後端在 `apps-script/`（需填寫的內容與部署步驟見 [../apps-script/README.md](../apps-script/README.md)）。

兩端均已實作，並對實際的 Sheet 測過（項目與結果見 [../apps-script/README.md](../apps-script/README.md) 的「實測結果」）。

> 標記 🔲 的段落尚未實作，只是設計方向。詳細進度見 [ROADMAP.md](../ROADMAP.md)。

---

## 請求與回應

### 共通

- 讀取走 `doGet` + query string，寫入走 `doPost` + JSON body。這是 Apps Script 只有 doGet/doPost 兩種入口所決定的，不是可選項
- **POST 的 `Content-Type` 要是 `text/plain`**，不是 `application/json`：後者會觸發 CORS 預檢（`OPTIONS`），而 Apps Script 的 Web App 回不了預檢。後端用 `JSON.parse(e.postData.contents)` 讀 body，內容仍然是 JSON
- **`table` 的值是前端的表代稱**（`schemas` 的 key，例如 `order`），而非 Sheet 分頁的名稱。後端另有一份「代稱 → 分頁名稱 + ID 欄表頭」的對照（`apps-script/Config.gs`），因此變更分頁名稱不影響前端
- 回應統一包裝成 `{ success: true, data }` 或 `{ success: false, error: { message, code? } }`
- **重要限制**：Apps Script Web App 無法自由設定 HTTP status code（幾乎都回 200），前端一律看 body 的 `success` 判斷成敗，不看 status
- 錯誤只回一句 `message`，不分類 error code——**例外只有前端需要分辨的情況**：`code: 'modified'`（衝突，見「資料一致性」），以及認證用的兩個（見「認證與權限」）
- 部署後的網址放環境變數 `VITE_APPS_SCRIPT_URL`（`.env`，不進版控；範本見 `.env.example`）。**沒設就走假後端**，所以 clone 下來不填任何東西就能跑

### 讀取

- **一次回整張表**：不分頁，也不帶排序、篩選、搜尋的參數——這些都在前端對抓回來的資料做。個人使用的資料量一次抓得完
- 回傳的 `data` 是 `{ rows, modifiedTime }`：`rows` 是以表頭為 key 的原始字串，型別由前端照 schema 轉換

### 寫入

- **只有一個 batch 端點**：body 帶 `operations: [{ table, kind, id, values? }, …]`，`kind` 是 `create`／`update`／`delete`。一個請求帶所有表的所有操作——要省的是每次請求的 script 冷啟（0.5～2 秒）與 Apps Script 每天的累計執行時間。Sheets API 每分鐘的次數限制不適用於 `SpreadsheetApp`；若改走進階服務 Sheets API，那條配額就回來了（兩種配額見根目錄 [README.md](../README.md) 的「技術選型」）
- 沒有單筆的 `create`／`update`／`delete` 端點，也沒有 `bulkUpdate`／`bulkDelete`：batch 都涵蓋得了。前端的佇列是逐筆的（快速編輯、批次刪除都拆成單筆進佇列，合併規則才適用），送出時才攤平成一串 operations
- **全有全無**：後端在 `LockService` 鎖裡跑完整批，中途失敗就什麼都不寫。前端保留佇列，使用者重按就是整批重送（`create` 定義成冪等的，所以安全）
- **不回傳資料列**：成功時的 `data` 只有 `{ modifiedTime }`。前端寫入當下就改好自己的快取了，推送成功後本來就會重抓整表
- **id 由前端產生**（`create` 的 payload 帶 id），重送因此是冪等的：`create` 定義成「id 不存在就建、已存在就當作已完成」，整批重送安全，不需要記錄哪幾筆成功過；待推送佇列也能直接用 `table + id` 當 key。後端仍然要擋重複 id——Sheet 可以手動打開來改，不能假設 id 只由前端產生
- **`update` 的 `values` 僅含進入過佇列的欄位**（表單送出整列，快速編輯與欄位動作僅送該欄），後端只寫入這些儲存格，因此同一列中未進入佇列的欄位會保留 Sheet 上手動修改的值與公式。送整列省不到呼叫（後端為了把 id 換成列號本來就要讀一次），卻會讓前端快取蓋掉手改的欄位
- **`table` 的值是前端的表代稱**（`schemas` 的 key，例如 `order`），而非 Sheet 分頁的名稱。後端另有一份「代稱 → 分頁名稱 + ID 欄表頭」的對照（`apps-script/Config.gs`），因此變更分頁名稱不影響前端
- payload 的欄位值**由前端轉換為 sheet 的形狀**（表頭作為 key、值為字串）後送出，後端原封不動寫入、不做任何型別轉換。值寫入儲存格時 Sheet 會自行解析該字串（見 [../apps-script/README.md](../apps-script/README.md) 的「值寫入儲存格的行為」）；會讓文字變成別的型別的值**由前端在 `serializeRow` 補上單引號前綴**，規則見 [../vue-build/docs/schema.md](../vue-build/docs/schema.md) 的「Sheet 上的慣例」
- 保留字：`table`、`id`、`kind` 不能拿來當欄位名稱

---

## 資料一致性

**驗證**：分工見 [vue-build/docs/schema.md](../vue-build/docs/schema.md)——合法性只在前端做（form 層與 store 寫入層都接了同一個 `validateRow`），後端只做安全性與結構完整性。目的不是防外部攻擊（那是認證的事，見下方「認證與權限」），而是防自己送出壞資料。

**多裝置同時編輯**（已實測）：比對**整個試算表檔案**的 `modifiedTime`，不是逐筆的 `updatedAt`——Sheets 沒有逐列的修改時間，要維護就得後端戳章加 `onEdit` 觸發器。

- `fetchTable` 的回應帶 `modifiedTime`（`DriveApp.getFileById(id).getLastUpdated()`），前端記下來
- batch 的 payload 帶 `since`，後端在 `LockService` 鎖裡跟當下的值比對再寫（跟全有全無同一把鎖）：不一致就回 `{ success: false, error: 'modified' }` 什麼都不寫，一致就寫入並回新的 `modifiedTime`
- 已實測 `SpreadsheetApp.flush()` 之後 `getLastUpdated()` 不會延遲，連續推送不會誤判為衝突
- **`since` 沒帶就是強制推送**：不比對、直接寫。前端的「強制推送」就是這樣送的
- 粒度很粗（任何分頁、連格式變更都算），單人多裝置的情境夠用。前端撞到衝突後的處置（保留佇列、兩條出路）見 [vue-build/docs/store.md](../vue-build/docs/store.md) 的推送那節

> `id` 是每張表都有的系統欄位，兩端都不當成一般欄位看：前端 `TableSchema` 用獨立的 `idColumn` 指出它對應哪個表頭、不放進 `columns`，`coerceRow()` 固定把它轉成 row 物件的 `id`；後端同樣從 `Config.gs` 的 `idColumn` 知道是哪一欄，用來把 id 換成列號。值本身由前端產生（見上方「請求與回應」）。

---

## 後端客製邏輯擴充點（Hooks）

> 🔲 **尚未實作。** 後端骨架（`apps-script/`）裡還沒有掛勾的位置，前端 `TableSchema` 也還沒有 `hooks` 欄位。這裡只記設計方向。前端算得出來、不用寫回 Sheet 的欄位已經有 `virtualColumns`（見 [schema.md](../vue-build/docs/schema.md)），hooks 是給「要落到 Sheet 上」的邏輯用的。

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

把關分成兩層、彼此獨立：

- **部署的存取權限**（Google 決定誰能呼叫這個 API）：各選項的實測結果見 [../apps-script/README.md](../apps-script/README.md) 的「認證」
- **程式內的認證**（選用，`Config.gs` 的 `AUTH`）：驗證方式可以替換，框架附帳號密碼的示範模組；設計與流程見 [auth.md](auth.md)

啟用程式內的認證時，請求與回應多了這幾件事：

- **登入**：POST 的 body 是 `{ action: 'login', credentials }`，成功時的 `data` 是 `{ token }`
- **每個請求**的網址都要帶 `?token=`（GET 沒有 body，所以 POST 也一樣放網址）
- **續期**：成功的回應可能在信封上另外帶 `token`（`{ success: true, data, token }`），前端收到就換上
- **錯誤**：`code: 'unauthorized'`（登入失敗或 token 無效）、`code: 'expired'`（token 過期）
