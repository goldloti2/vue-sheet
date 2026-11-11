# 後端（Apps Script）

Google Sheet 的 Apps Script Web App，是前端唯一的資料來源。介面的約定見 [../docs/api.md](../docs/api.md)。

> **狀態**：2026-10-02 已對實際的 Sheet 完成測試，讀取、新增、修改、刪除、衝突比對與字串轉義均正常。存取的保護見「認證」。

| 檔案 | 內容 |
| --- | --- |
| `Config.gs` | **唯一須填寫的檔案**：表代稱與分頁的對照、表頭的列號、登入方式（`AUTH`）。試算表 id 存於指令碼屬性，見「指令碼屬性」 |
| `Api.gs` | `doGet`、`doPost` 入口與 `{ success }` 信封，為前端唯一的進入點 |
| `Sheets.gs` | 單張表的讀取、表頭對應、列的尋找 |
| `Batch.gs` | 一次推送的完整流程：鎖、衝突比對、規劃、寫入 |
| `Auth.gs` | 登入（`action: 'login'`）、每個請求的 token 驗證，以及帳號管理（`addUser`、`removeUser`，在編輯器中手動執行）。見 [../docs/auth.md](../docs/auth.md) |
| `appsscript.json` | 專案的設定：時區、執行身分、存取權限。第一次以 clasp 下載時取得 |

- 沒有建置步驟：`.gs` 檔直接貼進 Apps Script 編輯器，或以 clasp 推送（見「clasp 指令」）
- 所有檔案共用同一個全域範圍，各檔的頂層依載入順序執行。因此頂層只宣告常數與函數，跨檔的引用一律放在函數中，於請求進來時才執行，載入順序即不影響結果

## 須填寫的內容

```js
const TABLES = {
  order: { sheetName: '訂單', idColumn: '訂單ID' },
}
const AUTH = null                  // null 為不驗證，'password' 為帳號密碼（見 ../docs/auth.md）
```

`TABLES` 的設定：
- key 為**前端的表代稱**，即 `vue-build/src/schema/index.ts` 中 `schemas` 的 key，不是分頁名稱。前端送出的是 `?table=order`
- **分頁的實際名稱只存於此處**，前端不保存。前端只有 `tableLabel`，即畫面上顯示的表名稱。因此修改分頁名稱時，只須修改此檔
- `idColumn` 為前端 schema 中主鍵欄的表頭，即 `sheetHeader`，省略時為 `label`
- 設定與實際情形不符時，後端回傳 `unknown table`、`sheet not found` 或 `id column not found`，訊息指出不符的項目

欄位名稱無須列出：payload 的 key 即為 Sheet 的表頭文字，後端以表頭比對，無法對應時回傳 `unknown column`。

**前端新增一張表時，此處須同步新增一行**（前端須修改的檔案見 [../vue-build/template/README.md](../vue-build/template/README.md)）：
- 代稱取自 `schemas` 的 key
- `idColumn` 取自該表 schema 中主鍵欄的表頭
- `sheetName` 填入分頁的實際名稱
- 未登記時，只有該張表回傳 `unknown table`，其餘各表不受影響

## 指令碼屬性

試算表 id、密鑰與帳號存於 Apps Script 的「指令碼屬性」，不寫入程式，也不進 repo。位置為編輯器的「專案設定 → 指令碼屬性」。以 clasp 推送時，指令碼屬性不會被覆蓋。

| 屬性 | 內容 | 設定方式 |
| --- | --- | --- |
| `SPREADSHEET_ID` | 試算表的 id，即網址中 `/d/` 與 `/edit` 之間的部分。選用，未設定時使用綁定的試算表 | 在「專案設定」手動新增 |
| `AUTH_SECRET` | 簽章 token 用的密鑰 | 執行 `setupSecret()`，見「使用帳號密碼的示範模組」 |
| `AUTH_USER_帳號` | 一個帳號一項，存放密碼的雜湊 | 執行 `addUser()`、`removeUser()` |

## 部署步驟

### 第一次部署

1. 於 Sheet 選擇「擴充功能 → Apps Script」，建立綁定的專案。使用其他試算表時，於指令碼屬性設定 `SPREADSHEET_ID`
2. 填妥 `Config.gs`
3. 將所有 `.gs` 檔放進專案：貼入編輯器，或以 clasp 推送（見「clasp 指令」的「第一次設定」）
4. 選擇「部署 → 新增部署作業 → 網頁應用程式」：**執行身分為「我」**，**存取權限見「認證」**
5. 將部署網址填入 `vue-build/.env` 的 `VITE_APPS_SCRIPT_URL`，並重新啟動前端的 dev server。開發模式下，每次請求的 payload 都輸出至瀏覽器的 console（`[api] → / ← / ✗`），這是對接時最直接的檢查方式

首次執行時要求授權 Sheets 與 Drive，`DriveApp` 用於讀取檔案的修改時間。同一個 Google 帳號只須授權一次。

### 修改程式後

修改 Apps Script 的程式後，須**重新部署**，否則前端呼叫的仍是舊版。

- **手動**：貼入修改的檔案，再選擇「管理部署作業 → 編輯 → 版本：新版本」
- **clasp**：執行 `push`，再執行 `update-deployment <部署ID>`（見「clasp 指令」的「日常修改後」）。部署 ID 為部署網址中 `/s/` 與 `/exec` 之間的部分
- **push 以本地的檔案整個取代線上專案**：在編輯器中直接修改過時，推送前先下載比對（見「線上被直接修改過時」）
- **不使用不帶部署 ID 的 `create-deployment`**：該指令建立新的部署，網址改變，`.env` 須跟著修改

## clasp 指令

clasp 為 Google 的 Apps Script 命令列工具，列於 `vue-build` 的 devDependencies。

- 所有指令在 `vue-build/` 執行，寫成 `npm run clasp -- 指令`。`npm run clasp` 先切換至 `apps-script/`，再執行 clasp
- 設定檔為 `apps-script/.clasp.json`，含指令碼 ID，不進 repo。內容有兩項：
  - `scriptId`：指令碼 ID，位於編輯器的「專案設定」
  - `scriptExtensions`：設為 `[".gs"]`，下載的檔案即以 `.gs` 存檔，與 repo 相同
- push 只上傳 `.gs` 與 `appsscript.json`，不上傳 `README.md`

### 第一次設定

| 指令或操作 | 用途 |
| --- | --- |
| 於 https://script.google.com/home/usersettings 開啟「Google Apps Script API」 | clasp 經由這個 API 存取專案。每個 Google 帳號設定一次 |
| `npm install` | 安裝 clasp |
| `npm run clasp -- login` | 在瀏覽器授權。憑證存於家目錄的 `.clasprc.json` |
| `npm run clasp -- show-authorized-user` | 顯示目前登入的帳號 |
| 建立 `apps-script/.clasp.json` | 填入 `scriptId` 與 `scriptExtensions` |
| `npm run clasp -- pull` | 下載線上的所有檔案，取得 `appsscript.json`。下載後以 `git diff` 比對 `.gs`，見「線上被直接修改過時」 |

### 日常修改後

| 指令 | 用途 |
| --- | --- |
| `npm run clasp -- show-file-status` | 列出 push 會上傳的檔案 |
| `npm run clasp -- push` | 以本地的檔案取代線上專案的所有檔案 |
| `npm run clasp -- push --watch` | 監看檔案，存檔時自動 push |
| `npm run clasp -- push --force` | `appsscript.json` 有修改時，不詢問即覆蓋線上的設定 |
| `npm run clasp -- list-deployments` | 列出所有部署與部署 ID |
| `npm run clasp -- update-deployment <部署ID> -d "說明"` | 以目前的程式建立新版本，部署改指到新版本。網址不變 |

### 查看線上的專案

| 指令 | 用途 |
| --- | --- |
| `npm run clasp -- open-script` | 在瀏覽器開啟編輯器，例如執行 `setupSecret()`、`addUser()` |
| `npm run clasp -- list-versions` | 列出所有版本的版本號與說明 |
| `npm run clasp -- list-scripts` | 列出帳號中的 Apps Script 專案與指令碼 ID |

### 回到舊版本

| 指令 | 用途 |
| --- | --- |
| `npm run clasp -- update-deployment <部署ID> -V <版本號>` | 部署改指到舊版本。網址不變 |
| `npm run clasp -- pull --versionNumber <版本號>` | 下載舊版本的程式查看。本地的檔案被覆蓋，查看後以 git 還原 |

### 線上被直接修改過時

1. 執行 `npm run clasp -- pull`，下載線上的檔案
2. 以 `git diff -- apps-script` 比對線上與 repo 的差異
3. 要保留的修改提交至 repo，其餘以 git 還原
4. 執行 `npm run clasp -- push`

### 帳號

| 指令 | 用途 |
| --- | --- |
| `npm run clasp -- logout` | 登出 |
| `npm run clasp -- login --user <名稱>` | 以指定的名稱登入另一個 Google 帳號 |
| `npm run clasp -- push --user <名稱>` | 以指定名稱的帳號執行。任何指令皆可加上 `--user` |

### 進階

以下指令須連結 Google Cloud 專案，並在 `.clasp.json` 填入 `projectId`。目前未設定。

| 指令 | 用途 |
| --- | --- |
| `npm run clasp -- tail-logs --watch` | 持續顯示線上執行的 `console.log` 輸出 |
| `npm run clasp -- run-function <函數名>` | 在終端機執行一個函數，例如 `setupSecret` |

## 認證

把關分成兩層，彼此獨立：

- **部署的存取權限**：由 Google 決定誰能使用這個 API。前端直接 `fetch` 時，只有「任何人」連得上。限制為 Google 帳號的設定須額外步驟（見下表）
- **程式內的認證**（選用）：由 `Config.gs` 的 `AUTH` 決定請求是否須帶 token，以及驗證的方式。可以不使用、使用框架附的帳號密碼示範模組，或換成自己的驗證方式。前後端的約定見 [../docs/auth.md](../docs/auth.md)

| 部署的存取權限 | 實測結果 |
| --- | --- |
| 只有我自己 | 由 Google 在程式執行前把關，安全性最高。但前端**直接 `fetch` 實測連不上**：<br>・跨網域的 `fetch` 不帶 Google 的 cookie，也不出現登入頁（本機 dev server 的情形）<br>・前端取得的是網路層的錯誤，不是 401 回應<br>・要連得上，前端須另外向 Google 申請 OAuth 的 access token，並隨請求送出。步驟較繁瑣，尚未實際試過 |
| 任何人 | 一定可以連線，Apps Script 回應 `Access-Control-Allow-Origin: *`。沒有程式內的認證時，**網址即等同於密碼**：取得網址的人即可讀寫整份 Sheet，因此網址只存放於不進版控的 `.env` |

### 使用帳號密碼的示範模組

`Config.gs` 設定 `AUTH = 'password'`，部署前在編輯器中執行：

1. `setupSecret()`：產生簽章 token 用的密鑰，執行一次
2. 在 `Auth.gs` 的 `ACCOUNT_USERNAME`、`ACCOUNT_PASSWORD` 填入帳號與密碼，執行 `addUser()`。完成後**清除密碼**

前端 `config/app.ts` 的 `authMethod` 同時設為 `'custom'`。

## 實作上的三項規則

以下三項由 `SpreadsheetApp` 的特性決定，修改程式時不得破壞：

- **每張表只讀取一次** used range（`readSheet`），之後尋找列、檢查重複的 id、計算列號，皆使用這份快取
- **讀取與寫入不交錯**：任何讀取都會強制 flush 之前的寫入。因此 `runBatch` 分為「規劃（只讀取）」與「寫入（只寫入）」兩段，中間不含讀取
- **刪除列由下往上**：否則先刪除的列會使之後的列號位移

全有全無的保證同樣來自這個順序：
- 結構檢查全部在規劃階段完成，寫入階段不存在預期內的失敗，因此無須回滾機制
- 若寫入過程中因配額或權限等原因中斷，仍可能留下部分結果。但前端的佇列不會被清除，整批重送具有冪等性：`create` 遇到已存在的 id 即略過

`update` 只寫入 payload 所含的儲存格，因此同一列中未進入佇列的欄位，保留 Sheet 上手動修改的值與公式。

`SpreadsheetApp` 的寫入能力，以下皆為一次呼叫：
- 單格
- 連續多格、同一個值：`getRange('A2:D2').setValue(v)`
- 連續多格、各自不同的值：`setValues`，維度須完全相符
- 不連續、同一個值：`getRangeList([...]).setValue(v)`

**只有「不連續、各自不同的值」沒有一次呼叫的方法**：`RangeList` 沒有 `setValues`。須以迴圈寫入，或改用進階服務 Sheets API 的 `Values.batchUpdate`。

## 值寫入儲存格的行為

寫入等同於「在該儲存格輸入文字」，Sheet 會自行解析字串。這個行為在此 App 的多數情況下是需要的：數字寫入後即為數字，日期寫入後即為日期，Sheet 上的 `SUM`、排序與日期格式才能正常運作。進階服務 Sheets API 的 `valueInputOption: 'RAW'` 反而會將 `1608` 存成文字，因此**無須為寫入掛載進階服務**。

由此衍生的行為：

- **轉義完全由前端處理**：`serializeRow` 對會使儲存格變成其他型別的值，加上單引號前綴，後端原樣寫入
  - 只有前端知道欄位型別：後端只依表頭比對，無法區分「文字欄位中的 `0912`」與「數字欄位中的 `0.5`」
  - 哪些值加單引號、哪些型別不加（包括 id 與 `ref` 不轉義的原因），見 [../vue-build/docs/topics/schema.md](../vue-build/docs/topics/schema.md) 的「Sheet 上的慣例」
- **原本為公式的儲存格，若該欄位經由 App 編輯過，公式會被替換為純字串**。這是預期的行為：
  - 後端讀取的是 `getDisplayValues()`，即計算後的結果，前端取得的也只是該字串，送回時只能寫入字串
  - **未進入佇列的欄位不會被寫入**，因為 `update` 只寫入 payload 所含的儲存格。因此只要不在 App 中編輯該欄位，公式即保留
- **新增的列為整列寫入**，未提供值的欄位寫入空字串。因此依賴整欄公式自動計算的欄位，在新增的列上會被清空

## 實測結果

2026-10-02 對實際的 Sheet 完成一輪測試：

| 項目 | 結果 |
| --- | --- |
| 讀取整張表、新增、修改單一欄位、刪除 | ✅ 正常，值的形狀未被改變 |
| `getDisplayValues()` 的日期格式 | ✅ 前端的 `coerceRow` 可正確解析 |
| `modifiedTime` 衝突比對 | ✅ 正常。`flush()` 之後 `getLastUpdated()` 沒有延遲，連續推送不會誤判為衝突 |
| 存取權限「只有我自己」 | ❌ 前端直接 `fetch` 無法連線，見「認證」 |
| 文字欄位寫入 `=`、`0` 開頭、分數、科學記號 | ✅ 由前端加上前綴後正常保留，讀回的值不含該前綴 |
| 數字與日期欄位 | ✅ 仍為數字與日期的儲存格，未被誤加前綴 |
