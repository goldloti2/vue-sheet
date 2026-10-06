# CRUD API 與後端約定

前端與 Apps Script 後端之間的介面，兩端皆依此實作：前端在 `vue-build/src/services/appScript.ts`，後端在 `apps-script/`（需填寫的內容與部署步驟見 [../apps-script/README.md](../apps-script/README.md)）。

> **標記說明**：沒有標記的段落＝已經實作、程式碼就是這樣。
> 🔶 部分實作、🔲 尚未實作（只是設計方向，程式碼裡還沒有）、✅ 用在被 🔶 段落包住、但本身已完成的小節。
> 詳細進度見 [ROADMAP.md](../ROADMAP.md)。

---

## CRUD API 設計決策

> **兩端均已實作，並於 2026-10-02 對實際的 Sheet 完成測試**：讀取、寫入與衝突比對皆正常。前端 `appScript.ts` 具備實際的 `fetch`（GET 讀取整張表、POST 送出 batch、解析 `{ success }` 信封、辨識衝突）；**`VITE_APPS_SCRIPT_URL` 未設定時自動改用 `services/mock/` 的假後端**，兩者回傳的形狀一致，因此上線僅需在 `.env` 填入網址。後端位於 `apps-script/`，需填寫的僅有 `Config.gs`（試算表 id、表代稱與分頁的對照）。尚未解決的項目見 [../apps-script/README.md](../apps-script/README.md)。

---

## 請求與回應

- 讀取走 `doGet` + query string，寫入走 `doPost` + JSON body。這是 Apps Script 只有 doGet/doPost 兩種入口所決定的，不是可選項
- **寫入只有一個 batch 端點**：body 帶 `operations: [{ table, kind, id, values? }, …]`，`kind` 是 `create`／`update`／`delete`。一個請求帶所有表的所有操作——要省的是每次請求的 script 冷啟（0.5～2 秒），不是配額
- **全有全無**：後端在 `LockService` 鎖裡跑完整批，中途失敗就什麼都不寫。前端保留佇列，使用者重按就是整批重送（`create` 定義成冪等的，所以安全）
- **不回傳資料列**：前端寫入當下就改好自己的快取了，推送成功後本來就會重抓整表。完整介面見 ROADMAP「後端 API 介面」
- **`update` 的 `values` 僅含進入過佇列的欄位**（表單送出整列，快速編輯與欄位動作僅送該欄），後端只寫入這些儲存格，因此同一列中未進入佇列的欄位會保留 Sheet 上手動修改的值與公式
- **`table` 的值是前端的表代稱**（`schemas` 的 key，例如 `order`），而非 Sheet 分頁的名稱。後端另有一份「代稱 → 分頁名稱 + ID 欄表頭」的對照（`apps-script/Config.gs`），因此變更分頁名稱不影響前端
- payload 的欄位值**由前端轉換為 sheet 的形狀**（表頭作為 key、值為字串）後送出，後端原封不動寫入、不做任何型別轉換。值寫入儲存格時 Sheet 會自行解析該字串：數字與日期的解析是需要的，而文字類欄位中「會讓儲存格變成別的型別」的值（開頭為 `=`、`+`、`0`，分數、科學記號）**由前端在 `serializeRow` 補上單引號前綴**——只有前端知道欄位型別，後端不做任何轉義。細節見 [../apps-script/README.md](../apps-script/README.md) 的「值寫入儲存格的行為」
- 保留字：`table`、`id`、`kind` 不能拿來當欄位名稱
- POST 的 body 另一種形狀是登入：`{ action: 'login', credentials }`，成功時的 `data` 是 `{ token }`（見 [auth.md](auth.md)）
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

**多裝置同時編輯**（已實測）：比對**整個試算表檔案**的 `modifiedTime`，不是逐筆的 `updatedAt`——Sheets 沒有逐列的修改時間，要維護就得後端戳章加 `onEdit` 觸發器。

- `fetchTable` 的回應帶 `modifiedTime`（`DriveApp.getFileById(id).getLastUpdated()`），前端記下來
- batch 的 payload 帶 `since`，後端在 `LockService` 鎖裡跟當下的值比對再寫（跟全有全無同一把鎖）：不一致就回 `{ success: false, error: 'modified' }` 什麼都不寫，一致就寫入並回新的 `modifiedTime`
- 已實測 `SpreadsheetApp.flush()` 之後 `getLastUpdated()` 不會延遲，連續推送不會誤判為衝突
- **`since` 沒帶就是強制推送**：不比對、直接寫。前端的「強制推送」就是這樣送的
- 粒度很粗（任何分頁、連格式變更都算），單人多裝置的情境夠用。前端撞到衝突後的處置（保留佇列、兩條出路）見 [vue-build/docs/store.md](../vue-build/docs/store.md) 的推送那節

> `id` 是每張表都有的系統欄位，兩端都不當成一般欄位看：前端 `TableSchema` 用獨立的 `idColumn` 指出它對應哪個表頭、不放進 `columns`，`coerceRow()` 固定把它轉成 row 物件的 `id`；後端同樣從 `Config.gs` 的 `idColumn` 知道是哪一欄，用來把 id 換成列號。值本身由前端產生（見 ROADMAP「後端 API 介面」）。

---

## 後端客製邏輯擴充點（Hooks）

> 🔲 **尚未實作。** 後端骨架（`apps-script/`）裡還沒有掛勾的位置，前端 `TableSchema` 也還沒有 `hooks` 欄位。這裡只記設計方向。前端算得出來、不用寫回 Sheet 的欄位已經有 `virtualColumns`（4.5），hooks 是給「要落到 Sheet 上」的邏輯用的。

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

> 🔶 **目前採用「任何人」，以網址作為唯一的保護，程式中不含任何認證邏輯。** 認證屬於**部署時的設定**而非程式的一部分；但預期的最終做法（僅限本人的 Google 帳號）尚未達成。

單人使用，無須自行實作登入：Apps Script 部署 Web App 時「執行身分」設為「我」，把關交由 Google 的「誰可以存取」處理。兩個選項的實測結果如下：

| 設定 | 結果 |
| --- | --- |
| **只有我自己** | 由 Google 在程式執行前完成把關，安全性最高。但**實測無法從前端連線**：跨網域的 `fetch()` 不會帶上 Google 的 cookie，且不會出現登入頁（本機 dev server 的情形），前端取得的是網路層錯誤而非 401 回應 |
| **任何人**（現況） | 一定可以連線（Apps Script 回應 `Access-Control-Allow-Origin: *`），但**網址等同於密碼**：取得網址者即可讀寫整份 Sheet，因此網址僅存放於不進版控的 `.env` |

🔲 程式內的認證設計已定、尚未實作，見 [auth.md](auth.md)：登入換取 token、之後每個請求在網址帶 `?token=`，驗證方式由可替換的模組決定。部署步驟與細節見 [../apps-script/README.md](../apps-script/README.md)。
