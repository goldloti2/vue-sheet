# 後端（Apps Script）

Google Sheet 的 Apps Script Web App，是前端唯一的資料來源。介面約定見 [../docs/api.md](../docs/api.md)。

> **狀態**：2026-10-02 已對實際的 Sheet 完成測試，讀取、新增、修改、刪除、衝突比對與字串轉義均正常。存取的保護見「認證」。

| 檔案 | 內容 |
| --- | --- |
| `Config.gs` | **唯一需要填寫的檔案**：試算表 id、表代稱與分頁的對照、表頭列號、登入方式（`AUTH`） |
| `Api.gs` | `doGet`／`doPost` 入口與 `{ success }` 信封，前端唯一的進入點 |
| `Sheets.gs` | 單張表的讀取、表頭對應、列的尋找 |
| `Batch.gs` | 一次推送的完整流程：鎖、衝突比對、規劃、寫入 |
| `Auth.gs` | 登入（`action: 'login'`）、每個請求的 token 驗證，與帳號管理（`addUser`／`removeUser`，在編輯器手動執行）。見 [../docs/auth.md](../docs/auth.md) |

無建置步驟，`.gs` 檔直接貼進 Apps Script 編輯器，或以 `clasp push` 上傳。所有檔案共用同一個全域範圍；各檔的頂層依載入順序執行，所以頂層只宣告常數與函式，跨檔的引用一律放在函式裡（請求進來時才執行），載入順序就不影響結果。

## 需要填寫的內容

```js
const SPREADSHEET_ID = ''          // 留空表示使用綁定的試算表
const TABLES = {
  order: { sheetName: '訂單', idColumn: '訂單ID' },
}
const AUTH = null                  // 不驗證；'password' 為帳號密碼（見 ../docs/auth.md）
```

`TABLES` 的 key 是**前端的表代稱**（`vue-build/src/schema/index.ts` 中 `schemas` 的 key），而非分頁名稱——前端送出的是 `?table=order`。**分頁的實際名稱僅存於此處**，前端並不保存（前端只有 `tableLabel`，即畫面上顯示的表名稱），因此變更分頁名稱只需修改本檔案；`idColumn` 則與前端 schema 的同名欄位一致。設定與實際情形不符時，後端會回傳 `unknown table`、`sheet not found` 或 `id column not found`，訊息會指出不符的項目。

欄位名稱無須列出：payload 的 key 即 Sheet 的表頭文字，後端以表頭比對，無法對應時回傳 `unknown column`。

**前端新增一張表時，此處需同步新增一行**（前端需修改的檔案見 [../vue-build/template/README.md](../vue-build/template/README.md)）：代稱取自 `schemas` 的 key，`idColumn` 取自該表 schema 的同名欄位，`sheetName` 填入分頁的實際名稱。未登記時僅該張表回傳 `unknown table`，其餘各表不受影響。

## 部署步驟

1. 於 Sheet 選擇「擴充功能 → Apps Script」，將所有 `.gs` 檔貼入（採用綁定方式時 `SPREADSHEET_ID` 留空）
2. 填妥 `Config.gs`
3. 選擇「部署 → 新增部署作業 → 網頁應用程式」：**執行身分為「我」**，**存取權限見「認證」**
4. 將部署網址填入 `vue-build/.env` 的 `VITE_APPS_SCRIPT_URL`，並重新啟動前端 dev server。dev 模式下每次請求的 payload 都會輸出到瀏覽器 console（`[api] → / ← / ✗`），是對接時最直接的檢查方式
5. 修改 Apps Script 程式後必須**重新部署**（「管理部署作業 → 編輯 → 版本：新版本」），否則前端打到的仍是舊版

首次執行會要求授權（Sheets 與 Drive，`DriveApp` 用於讀取檔案的修改時間），同一個 Google 帳號僅需授權一次。

## 認證

把關分成兩層，彼此獨立：

- **部署的存取權限**：由 Google 決定誰能使用這個API。前端直接 `fetch` 時只有「任何人」連得上；限制成 Google 帳號的設定需要額外步驟（見下表）
- **程式內的認證**（選用）：由 `Config.gs` 的 `AUTH` 決定請求要不要帶 token、怎麼驗。可以不用、用框架附的帳號密碼示範模組，或換成自己的驗證方式；前後端的約定見 [../docs/auth.md](../docs/auth.md)

| 部署的存取權限 | 實測結果 |
| --- | --- |
| 只有我自己 | 由 Google 在程式執行前完成把關，安全性最高。但前端**直接 `fetch` 實測連不上**：跨網域的 `fetch` 不會帶上 Google 的 cookie，且不會出現登入頁（本機 dev server 的情形），前端取得的是網路層錯誤而非 401 回應。要讓它連得上，前端得另外向 Google 申請 OAuth 的 access token 並隨請求送出；步驟較繁瑣，尚未實際試過 |
| 任何人 | 一定可以連線（Apps Script 回應 `Access-Control-Allow-Origin: *`）。沒有程式內的認證時**網址等同於密碼**：取得網址者即可讀寫整份 Sheet，因此網址僅存放於不進版控的 `.env` |

### 使用帳號密碼的示範模組

`Config.gs` 設 `AUTH = 'password'`，部署前在編輯器執行：

1. `setupSecret()`：產生簽 token 用的密鑰，執行一次
2. 在 `Auth.gs` 的 `ACCOUNT_USERNAME`／`ACCOUNT_PASSWORD` 填入帳密，執行 `addUser()`；完成後**清掉密碼**

前端 `config/app.ts` 的 `authMethod` 同時設為 `'custom'`。

## 實作上的三項規則

以下三項由 `SpreadsheetApp` 的特性決定，修改程式時不應破壞：

- **每張表只讀取一次** used range（`readSheet`），後續尋找列、檢查重複 id、計算列號皆使用該份快取
- **讀取與寫入不交錯**：任何讀取都會強制 flush 先前的寫入，因此 `runBatch` 分為「規劃（僅讀取）」與「寫入（僅寫入）」兩段，中間不含讀取
- **刪除列由下往上**，否則先刪除的列會使後續列號位移

全有全無的保證同樣來自這個順序：結構檢查全部在規劃階段完成，寫入階段不存在預期內的失敗，因此不需要回滾機制。若寫入過程中因配額或權限等原因中斷，仍可能留下部分結果，但前端佇列不會被清除，整批重送具有冪等性（`create` 遇到已存在的 id 即跳過）。

`update` 僅寫入 payload 所含的儲存格，因此同一列中未進入佇列的欄位會保留 Sheet 上手動修改的值與公式。

`SpreadsheetApp` 的寫入能力：單格、連續多格同值（`getRange('A2:D2').setValue(v)`）、連續多格不同值（`setValues`，維度須完全相符）、不連續同值（`getRangeList([...]).setValue(v)`）都是一次呼叫；**只有「不連續、各自不同值」沒有**（`RangeList` 沒有 `setValues`），須迴圈寫入，或改用進階服務 Sheets API 的 `Values.batchUpdate`。

## 值寫入儲存格的行為

寫入等同於「在該儲存格輸入文字」，Sheet 會自行解析字串。這個行為對本 App 多數情況是需要的：數字寫入後即為數字、日期寫入後即為日期，Sheet 上的 `SUM`、排序與日期格式才能正常運作（進階服務 Sheets API 的 `valueInputOption: 'RAW'` 反而會將 `1608` 存成文字，因此**不需為寫入掛載進階服務**）。由此衍生的行為如下：

- **轉義完全由前端處理**（`serializeRow` 對會讓儲存格變成別的型別的值補單引號前綴），後端原封不動寫入。只有前端知道欄位型別：後端僅依表頭比對，無法區分「文字欄位中的 `0912`」與「數字欄位中的 `0.5`」。哪些值會補、哪些型別不補（含 id 與 `ref` 不轉義的原因），見 [../vue-build/docs/schema.md](../vue-build/docs/schema.md) 的「Sheet 上的慣例」
- **原本為公式的儲存格，若該欄位經由 App 編輯過，公式會被替換為純字串**。這是預期行為：後端讀取的是 `getDisplayValues()`（計算後的結果），前端取得的也僅是該字串，送回時只能寫入字串。**未進入佇列的欄位不會被寫入**（`update` 只寫 payload 所含的儲存格），因此只要不在 App 中編輯該欄位，公式即會保留
- **新增的列為整列寫入**（未提供值的欄位寫入空字串），因此依賴整欄公式自動計算的欄位，在新增的列上會被清空

## 實測結果

2026-10-02 對實際的 Sheet 完成一輪測試：

| 項目 | 結果 |
| --- | --- |
| 讀取整張表、新增、修改單一欄位、刪除 | ✅ 正常，值的形狀未被改變 |
| `getDisplayValues()` 的日期格式 | ✅ 前端 `coerceRow` 可正確解析 |
| `modifiedTime` 衝突比對 | ✅ 正常；`flush()` 後 `getLastUpdated()` 無延遲，連續推送不會誤判為衝突 |
| 存取權限「只有我自己」 | ❌ 前端直接 `fetch` 無法連線，見「認證」 |
| 文字欄位寫入 `=`、`0` 開頭、分數、科學記號 | ✅ 由前端補前綴後正常保留，讀回的值不含該前綴 |
| 數字與日期欄位 | ✅ 仍為數字與日期儲存格，未被誤加前綴 |
