# CRUD API 與後端約定

前端與 Apps Script 後端之間的介面，兩端皆依此實作：
- 前端位於 `vue-build/src/services/appScript.ts`
- 後端位於 `apps-script/`。須填寫的內容與部署步驟見 [../apps-script/README.md](../apps-script/README.md)

兩端均已實作，並對實際的 Sheet 測試過。項目與結果見 [../apps-script/README.md](../apps-script/README.md) 的「實測結果」。

> 標記 🔲 的段落尚未實作，只是設計方向。詳細進度見 [ROADMAP.md](../ROADMAP.md)。

---

## 請求與回應

### 共通

- 讀取使用 `doGet` 與 query string，寫入使用 `doPost` 與 JSON body。Apps Script 只有 doGet、doPost 兩種入口，因此這不是可選的設計
- **POST 的 `Content-Type` 須為 `text/plain`**，不是 `application/json`。後者會觸發 CORS 預檢（`OPTIONS`），而 Apps Script 的 Web App 無法回應預檢。後端以 `JSON.parse(e.postData.contents)` 讀取 body，內容仍為 JSON
- **`table` 的值為前端的表代稱**（`schemas` 的 key，例如 `order`），不是 Sheet 分頁的名稱。後端另有一份「代稱 → 分頁名稱 + ID 欄表頭」的對照（`apps-script/Config.gs`），因此修改分頁名稱不影響前端
- 回應統一包裝為 `{ success: true, data }` 或 `{ success: false, error: { message, code? } }`
- **重要限制**：Apps Script Web App 無法自由設定 HTTP status code，幾乎都回傳 200。前端一律依 body 的 `success` 判斷成敗，不看 status
- 錯誤只回傳一句 `message`，不分類 error code。**例外只有前端須分辨的情況**：
  - `code: 'modified'`：衝突，見「資料一致性」
  - 認證用的兩個 code，見「認證與權限」
- **前端同時送出的請求有上限**，超過的請求在前端排隊。Web App 以部署者的身分執行，所有使用者的請求共用部署者的同時執行上限。超過上限的請求由 Apps Script 直接回傳錯誤，不排隊。上限為 `vue-build/src/services/appScript.ts` 的 `MAX_CONCURRENT_REQUESTS`，預設為 6。
- 部署後的網址放在環境變數 `VITE_APPS_SCRIPT_URL`（`.env`，不進版控，範本見 `.env.example`）。**未設定時使用假後端**，因此 clone 後不填任何設定即可執行

### 讀取

- **一次回傳整張表**：不分頁，也不帶排序、篩選、搜尋的參數。這些都由前端對抓回的資料處理。個人使用的資料量可一次抓完
- 回傳的 `data` 為 `{ rows, modifiedTime }`。`rows` 為以表頭為 key 的原始字串，型別由前端依 schema 轉換

### 寫入

- **只有一個 batch 端點**：body 帶有 `operations: [{ table, kind, id, values? }, …]`，`kind` 為 `create`、`update`、`delete`
  - 一個請求帶有所有表的所有操作，以節省每次請求的 script 冷啟（0.5～2 秒），以及 Apps Script 每天的累計執行時間
  - Sheets API 每分鐘的次數限制不適用於 `SpreadsheetApp`。若改用進階服務的 Sheets API，該配額即重新適用（兩種配額見根目錄 [README.md](../README.md) 的「技術選型」）
- 沒有單筆的 `create`、`update`、`delete` 端點，也沒有 `bulkUpdate`、`bulkDelete`，batch 都能涵蓋
  - 前端的佇列以列為單位：快速編輯、刪除選取的列都拆成單筆進入佇列，合併規則才適用
  - 送出時才攤平成一串 operations
- **全有全無**：後端在 `LockService` 的鎖中執行完整批操作，中途失敗即全部不寫入。前端保留佇列，使用者重按即整批重送。`create` 定義為冪等，因此重送安全
- **不回傳資料列**：成功時的 `data` 只有 `{ modifiedTime }`。前端寫入時即已修改自己的快取，推送成功後本來就會重抓整張表
- **id 由前端產生**（`create` 的 payload 帶有 id），重送因此是冪等的：
  - `create` 定義為「id 不存在即建立，已存在即視為已完成」，整批重送安全，無須記錄哪幾筆成功過
  - 待推送佇列也能直接以 `table + id` 作為 key
  - 後端仍須擋下重複的 id：Sheet 可以手動開啟修改，不能假設 id 只由前端產生
- **`update` 的 `values` 只含進入過佇列的欄位**：表單送出整列，快速編輯與欄位動作只送出該欄。後端只寫入這些儲存格，因此同一列中未進入佇列的欄位，保留 Sheet 上手動修改的值與公式
  - 送出整列省不到呼叫：後端為了把 id 換成列號，本來就須讀取一次
  - 送出整列卻會讓前端的快取覆蓋手動修改的欄位
- payload 的欄位值**由前端轉換為 Sheet 的形狀**後送出，即以表頭為 key、值為字串。後端原樣寫入，不做任何型別轉換
  - 值寫入儲存格時，Sheet 會自行解析該字串（見 [../apps-script/README.md](../apps-script/README.md) 的「值寫入儲存格的行為」）
  - 會使文字變成其他型別的值，**由前端在 `serializeRow` 加上單引號前綴**，規則見 [../vue-build/docs/topics/schema.md](../vue-build/docs/topics/schema.md) 的「Sheet 上的慣例」
- 保留字：`table`、`id`、`kind` 不能作為欄位名稱

---

## 資料一致性

**驗證**：分工見 [vue-build/docs/topics/schema.md](../vue-build/docs/topics/schema.md)。
- 合法性只在前端檢查：表單層與 store 的寫入層都接了同一個 `validateRow`
- 後端只檢查安全性與結構完整性
- 目的不是防範外部攻擊（那是認證的範圍，見下方「認證與權限」），而是防止自己送出錯誤的資料

**多裝置同時編輯**（已實測）：比對**整個試算表檔案**的 `modifiedTime`，不是逐列的 `updatedAt`。Sheets 沒有逐列的修改時間，若要維護，須由後端加上戳記並設定 `onEdit` 觸發器。

- `fetchTable` 的回應帶有 `modifiedTime`（`DriveApp.getFileById(id).getLastUpdated()`），前端記下這個值
- 後端於讀取資料之前取得 `modifiedTime`。讀取期間有其他寫入時，回傳的時間較舊，下一次推送即判定為衝突，不會覆蓋那次寫入
- batch 的 payload 帶有 `since`。後端在 `LockService` 的鎖中與當時的值比對後再寫入，與全有全無使用同一把鎖：
  - 不一致時，回傳 `{ success: false, error: 'modified' }`，全部不寫入
  - 一致時，寫入並回傳新的 `modifiedTime`
- 已實測 `SpreadsheetApp.flush()` 之後，`getLastUpdated()` 不會延遲，連續推送不會誤判為衝突
- **未帶 `since` 即為強制推送**：不比對，直接寫入。前端的「強制推送」即以此方式送出
- 比對的粒度很粗：任何分頁的修改，連格式的變更都算在內。單人多裝置的情境已足夠。前端遇到衝突後的處置（保留佇列、兩條出路），見 [vue-build/docs/topics/store.md](../vue-build/docs/topics/store.md) 的推送那一節

> 每張表都有一個主鍵欄：
> - 前端 `TableSchema` 的 `idColumn` 指向 `columns` 中的那一欄，`coerceRow()` 讀出主鍵時，同時作為列物件的 `id`
> - 後端從 `Config.gs` 的 `idColumn`（該欄的表頭）得知主鍵欄，用來把 id 換成列號
> - 主鍵的值由前端決定（見上方「請求與回應」）
>
> 主鍵的格式由前端於新增時驗證，後端不檢查：
> - 不以數字或 `=`、`+`、`-`、`'` 開頭：避免 Sheet 把 id 解析為數字、公式或純文字前綴而找不到列
> - 只能使用英文字母、數字與 `- _ . ! ~ * ' ( )`，即 `encodeURIComponent` 不會改變的字元，且不能為 `.` 或 `..`：id 會直接放進前端的網址
> - 直接在 Sheet 上手動輸入的 id 不經過這項驗證。不符合時，可能找不到列，或無法開啟該列的頁面（規則見 [vue-build/docs/topics/schema.md](../vue-build/docs/topics/schema.md) 的「主鍵」）

---

## 後端客製邏輯擴充點（Hooks）

> 🔲 **尚未實作。** 後端骨架（`apps-script/`）中還沒有掛勾的位置，前端 `TableSchema` 也還沒有 `hooks` 欄位。此處只記錄設計方向。前端算得出、無須寫回 Sheet 的欄位已有 `virtualColumns`（見 [schema.md](../vue-build/docs/topics/schema.md)），hooks 用於須寫入 Sheet 的邏輯。

某張表須「泛用 CRUD 以外」的邏輯時（自動計算欄位、送出前驗證、建立後通知），在 schema 中掛勾：

```ts
hooks: {
  beforeCreate: (data) => { /* ... */ return data },
  computedFields: { 計算欄位名: (row) => /* ... */ }
}
```

泛用引擎在對應的時機檢查該表是否掛了 hook，有則呼叫，沒有則執行預設流程。**特例一律以「加掛勾」處理，不修改引擎**。

---

## 認證與權限

把關分成兩層，彼此獨立：

- **部署的存取權限**：由 Google 決定誰能呼叫這個 API。各選項的實測結果見 [../apps-script/README.md](../apps-script/README.md) 的「認證」
- **程式內的認證**（選用，`Config.gs` 的 `AUTH`）：驗證方式可以替換，框架附有帳號密碼的示範模組。設計與流程見 [auth.md](auth.md)

啟用程式內的認證時，請求與回應另外多了這幾件事：

- **登入**：POST 的 body 為 `{ action: 'login', credentials }`，成功時的 `data` 為 `{ token }`
- **每個請求**的網址都須帶有 `?token=`。GET 沒有 body，因此 POST 也同樣放在網址上
- **續期**：成功的回應可能在信封上另外帶有 `token`（`{ success: true, data, token }`），前端收到即替換
- **錯誤**：`code: 'unauthorized'` 表示登入失敗或 token 無效，`code: 'expired'` 表示 token 過期
