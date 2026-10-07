# 認證

> **狀態**：設計已定，大部分已實作。登入（加鹽的 SHA-256 比對帳密）、發 token、每個請求驗 token（格式、過期、帳號是否存在）、續期、前端帶 token 與失效時回登入頁都已完成。🔲 尚未實作：token 簽章（目前任何人都改得了 token）、登入失敗次數限制。

認證是**可選的**：不啟用時行為與現在相同（存取權限為「任何人」，見 [apps-script/README.md](../apps-script/README.md) 的「認證」）。後端視為可信任，認證只負責確認連進來的前端有權限。

整套分成兩層：前後端之間的**約定**是固定的；**如何驗證**是可替換的模組。框架附一個帳號密碼的示範模組，供尚未接上 OAuth、又需要限制存取時使用；管理員也可以換成自己寫的認證流程。

---

## 約定

不論採用哪一種認證，流程都是「以某種憑證換取 token，之後每個請求都帶著 token」。前端把 token 當成不透明的字串，不解析其內容。

| | 內容 |
| --- | --- |
| 登入 | POST body `{ action: 'login', credentials: {…} }`，成功時 `data` 為 `{ token }`。`credentials` 的內容由模組決定 |
| 每個請求 | 網址帶 `?token=…`（GET 與 POST 皆同） |
| 續期 | 任何成功的回應都可以在信封上附帶新的 token：`{ success: true, data, token }`，前端收到即替換（`appScript.ts` 的 `unwrap`）。放在信封而不是 `data` 裡，各端點的 `data` 形狀才不受影響 |
| 錯誤 | `code: 'expired'`：token 過期；`code: 'unauthorized'`：token 無效、帳號不存在或登入失敗 |

- token 放在網址：GET 沒有 body，兩種請求一律放網址，後端只需在一處讀取（`e.parameter.token`）。不能放在 header，自訂 header 會觸發 CORS 預檢，而 Apps Script 無法回應預檢
- 登入的憑證放在 body（`e.postData.contents`），也就是 batch 的 `{ operations, since }` 所在的同一處，僅內容不同。密碼不放在網址

## 後端

`Config.gs` 的 `AUTH` 選擇使用的模組：

```js
const AUTH = null          // 不驗證
// const AUTH = 'password' // 示範模組：帳號密碼（Auth.gs 的 PasswordAuth）
```

`Auth.gs` 的 `authModule()` 依 `AUTH` 取出模組。自行撰寫的模組：寫一個有 `login`／`verify` 的物件，在 `authModule()` 加一個分支對應到新的 `AUTH` 值。之所以在函式裡查、而不是讓 `AUTH` 直接等於模組物件：各 `.gs` 檔的頂層依載入順序執行，`Config.gs` 執行時其他檔的物件可能還不存在；請求進來時才保證全部載完。

模組須實作兩個函式：

| 函式 | 回傳 | 失敗時 |
| --- | --- | --- |
| `login(credentials)` | token 字串 | 擲出 `unauthorized` |
| `verify(token)` | `{ user, token? }`；`token` 是續期用的新 token，不需要續期時省略 | 擲出 `expired` 或 `unauthorized` |

`Api.gs` 只負責分派：body 為 `action: 'login'` 時交給 `login()`（包成 `{ token }` 回傳），其他請求先經過 `authorize()`（呼叫模組的 `verify`），**在開啟試算表之前**完成。`AUTH` 為 `null` 時不驗證，此時呼叫登入會回錯誤。

`verify` 回傳的 `user` 保留給日後的權限檢查（多人使用時，依使用者限制可讀寫的表）；目前不做權限檢查。

## 前端

`config/app.ts` 的 `authMethod` 決定登入方式，須與後端的 `AUTH` 對得上：

| `authMethod` | 後端 `AUTH` | 登入頁放的元件 |
| --- | --- | --- |
| `'none'` | `null` | 沒有登入頁：guard 不作用，`/login` 轉回首頁 |
| `'custom'` | `'password'` 或自行撰寫的模組 | `PasswordLoginForm`（自行撰寫的模組若需要不同欄位，改 `pages/login.vue`） |
| `'google'` | Google 的模組 | Google 登入按鈕（🔲 尚未實作） |

| 檔案 | 內容 |
| --- | --- |
| `services/auth/token.ts` | token 的讀寫：存在 `localStorage`（key 帶 `BASE_URL` 前綴，避免同網域的其他 App 互相覆蓋），另有一份 `shallowRef` 供畫面與 guard 讀取。前端只存 token |
| `services/auth/tokenMessage.ts` | token 裡 message 的編碼與解碼。正式流程不解析 token，只有假後端用 |
| `router/index.ts` | 全域 `beforeEach`：連第一次開啟（直接貼網址、重新整理）都會經過，沒有 token 就轉到 `/login?redirect=原目的地`。標了 `meta.public` 的頁面不檢查。另外 `watch` token：token 被清掉時人還在要登入的頁面，就帶去登入頁（`redirect` 是當下這頁） |
| `services/appScript.ts` | 每個請求的網址帶上 `?token=`；後端回 `unauthorized`／`expired` 時拋 `AuthError` 並清掉 token；回應附帶續期的 token 時換上。`fetchToken(credentials)`：送出 `{ action: 'login', credentials }`、取回 token。沒設 `VITE_APPS_SCRIPT_URL` 時走假後端（`mockLogin` 收到什麼都算成功、`mockAuthorize` 檢查格式與過期、同樣會續期）。dev 模式的 console 紀錄會把密碼與登入回傳的 token 遮掉 |
| `composables/auth/useLogin.ts` | 登入頁的資料層：送出（`fetchToken`）、錯誤訊息、成功後存 token、重抓已載入與載入失敗的表（`store.reload()`，不推送），再以 `replace` 前往 `redirect`（只接受站內路徑） |
| `components/ui/auth/PasswordLoginForm.vue` | 帳號密碼表單，見 [PasswordLoginForm](../vue-build/docs/components/PasswordLoginForm.md) |
| `pages/login.vue` | 登入頁本身，整頁自己排版（置中卡片、標題、錯誤訊息），表單用上面那個元件。專案要改外觀（logo、標題、背景、版面）就直接改這個檔 |
| `components/ui/shell/AppShell.vue` | `meta.shell: false` 的頁面不顯示 App Bar、側邊欄與底部導覽列；`authMethod` 不是 `'none'` 時側邊欄有「登出」 |

流程：

- 登入頁：送出憑證、取得 token、存入後前往 `redirect`。登入後的第一頁沒有 App 內的上一頁（登入頁已被 `replace` 掉），返回鍵依此判斷
- 收到 `expired` 或 `unauthorized`：清除 token，由 router 帶到登入頁；登入後回到原本那頁，用過的表（含載入失敗的）會重抓
- 未推送的佇列一律保留，重新登入後按同步即可推送（batch 設計為可整批重送，因此安全）
- 登出：有未推送的變更時先詢問，清除 token（router 一樣會帶到登入頁）；佇列保留

**可替換的只有登入頁上的表單元件**。改用 Google 登入時，`PasswordLoginForm` 換成 Google 的按鈕，取得的 ID token 放進 `credentials` 送出，其餘流程不變。

---

## 示範模組：帳號密碼（`PasswordAuth`）

定位是**沒有 OAuth 時的暫時性方案**。帳號只能由管理員在後端手動加入，前端沒有註冊或管理帳號的畫面。

### 儲存位置

| 位置 | 存什麼 |
| --- | --- |
| Script Properties | `AUTH_SECRET`：簽 token 用的密鑰（一長串隨機字串）<br>`AUTH_USER_<名稱>`：`{ salt, hash }`，一人一筆 |
| CacheService | 登入失敗的次數（暫存，到期自動消失） |

Script Properties 只有能編輯此腳本專案的人看得到（專案設定 → 指令碼屬性），也可以直接在該畫面刪改；一人一筆的好處是在畫面上就能看到有哪些帳號、直接刪除。

### 管理員手動執行的函式

在 Apps Script 編輯器中執行。編輯器的「執行」鈕無法傳入參數，因此帳號與密碼先填在 `Auth.gs` 的 `ACCOUNT_USERNAME`／`ACCOUNT_PASSWORD` 兩個常數，再從上方選單選擇函式執行；**執行完畢後須將密碼清空**，不留在程式碼中。

- 🔲 `setupSecret()`：產生 `AUTH_SECRET`，只需執行一次
- `addUser()`：產生 salt、計算雜湊、寫入 `AUTH_USER_<名稱>`；同名帳號即覆寫（等於改密碼）
- `removeUser()`：刪除 `AUTH_USER_<名稱>`（只需填帳號）

也可以不經過函式，直接在「專案設定 → 指令碼屬性」畫面上**刪除**帳號：刪掉該帳號的那一筆屬性即可。**新增或改密碼只能用 `addUser()`**——屬性的值是 salt 與雜湊結果，無法手動填寫。

### 登入

`credentials` 為 `{ username, password }`，密碼以明文傳送，由 HTTPS 保護。

1. 🔲 檢查失敗次數：連續失敗 5 次即鎖定 15 分鐘
2. 讀取 `AUTH_USER_<username>`，計算 `SHA256(password + salt)` 與 `hash` 比對
3. 成功即發出 token

- salt 每人各自隨機產生（`Utilities.getUuid()`），改密碼時也重新產生
- 雜湊結果以 base64 字串存放：`AUTH_USER_<名稱>` 的值是 `{"salt":"…","hash":"…"}`
- 使用 SHA-256 是因為 Apps Script 沒有 bcrypt 等密碼專用的雜湊

### token

🔶 目前還沒有簽章：token 只有 `payload` 那段（沒有 `.` 與後面的簽章），任何人都能解開、改掉再編碼回去。下面是完成後的格式。

```
message = { user: 名稱, exp: 後端當下時間 + 30 天 }    // exp 單位為秒
payload = base64url(JSON.stringify(message))
token   = payload + "." + base64url(HMAC_SHA256(AUTH_SECRET, payload))
```

- 簽章使用 HMAC 與只有後端持有的 `AUTH_SECRET`，不知道密鑰就無法偽造 token
- 簽的是編碼後的 `payload` 字串，驗證時直接以收到的字串重算，不必將 JSON 重新序列化
- `exp` 以後端的時鐘計算
- base64url 是編碼而非加密：用途是讓二進位的簽章與含特殊字元的 JSON 能放進網址，且輸出不含分隔用的 `.`。message 任何人都能解開讀取，因此不放任何秘密；token 防的是竄改，而非讀取

### 驗證

1. 🔲 以 `.` 拆開 token，對收到的 `payload` 以 `AUTH_SECRET` 重算 HMAC 並比對，不符即 `unauthorized`；相符才解開 `payload` 讀取 message。（目前直接解開；解不開或缺欄位即 `unauthorized`）
2. 檢查 `exp`，已過期即 `expired`
3. 檢查 `AUTH_USER_<user>` 仍存在，不存在即 `unauthorized`
4. 剩餘效期不足一半（15 天）時發出新 token（續期）：`authorize` 把它交給 `Api.gs`，由 `respond` 放上信封

只要 30 天內使用過一次，就不需要重新登入。作廢單一使用者：`removeUser`（已可用）；作廢所有 token：重新執行 `setupSecret()`（🔲 簽章完成後）。
