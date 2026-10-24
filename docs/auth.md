# 認證

> **狀態**：帳號密碼的示範模組已完成，包括：
> - 登入：以加鹽的 SHA-256 比對帳號密碼
> - 發出 token：以 HMAC 簽章
> - 每個請求驗證 token：簽章、過期、帳號是否存在
> - 續期
> - 前端帶上 token，失效時回到登入頁
>
> 🔲 Google 登入尚未實作。

認證是**選用的**：不啟用時，後端不驗證任何請求，網址即為唯一的保護（部署設定見 [apps-script/README.md](../apps-script/README.md) 的「認證」）。後端視為可信任，認證只負責確認連進來的前端有權限。

整套分成兩層：
- 前後端之間的**約定**是固定的
- **驗證的方式**是可替換的模組。框架附有一個帳號密碼的示範模組，供尚未接上 OAuth、又須限制存取時使用。管理員也可以換成自行撰寫的認證流程

---

## 約定

不論採用哪一種認證，流程都是「以某種憑證換取 token，之後每個請求都帶著 token」。前端把 token 視為不透明的字串，不解析其內容。

| | 內容 |
| --- | --- |
| 登入 | POST body `{ action: 'login', credentials: {…} }`，成功時 `data` 為 `{ token }`。`credentials` 的內容由模組決定 |
| 每個請求 | 網址帶上 `?token=…`，GET 與 POST 皆同 |
| 續期 | 任何成功的回應都可以在信封上附帶新的 token：`{ success: true, data, token }`。前端收到即替換（`appScript.ts` 的 `unwrap`）。token 放在信封、不放在 `data` 中，各端點的 `data` 形狀才不受影響 |
| 錯誤 | `code: 'expired'`：token 過期。`code: 'unauthorized'`：token 無效、帳號不存在或登入失敗 |

- **token 放在網址**：GET 沒有 body，因此兩種請求一律放在網址，後端只須在一處讀取（`e.parameter.token`）。token 不能放在 header：自訂 header 會觸發 CORS 預檢，而 Apps Script 無法回應預檢
- **登入的憑證放在 body**（`e.postData.contents`），即 batch 的 `{ operations, since }` 所在的同一處，只是內容不同。密碼不放在網址

## 後端

`Config.gs` 的 `AUTH` 選擇使用的模組：

```js
const AUTH = null          // 不驗證
// const AUTH = 'password' // 示範模組：帳號密碼（Auth.gs 的 PasswordAuth）
```

`Auth.gs` 的 `authModule()` 依 `AUTH` 取出模組。
- 自行撰寫模組時：寫一個有 `login`、`verify` 的物件，並在 `authModule()` 加一個分支，對應到新的 `AUTH` 值
- 模組在函數中查找，不讓 `AUTH` 直接等於模組物件：各 `.gs` 檔的頂層依載入順序執行，`Config.gs` 執行時，其他檔的物件可能還不存在。請求進來時，才保證全部載入完成

模組須實作兩個函數：

| 函數 | 回傳 | 失敗時 |
| --- | --- | --- |
| `login(credentials)` | token 字串 | 擲出 `unauthorized` |
| `verify(token)` | `{ user, token? }`。`token` 為續期用的新 token，無須續期時省略 | 擲出 `expired` 或 `unauthorized` |

`Api.gs` 只負責分派：
- body 為 `action: 'login'` 時，交給 `login()`，並包裝成 `{ token }` 回傳
- 其他請求先經過 `authorize()`，即呼叫模組的 `verify`。這一步**在開啟試算表之前**完成
- `AUTH` 為 `null` 時不驗證，此時呼叫登入會回傳錯誤

`verify` 回傳的 `user` 保留給日後的權限檢查，例如多人使用時，依使用者限制可讀寫的表。目前不做權限檢查。

## 前端

`config/app.ts` 的 `authMethod` 決定登入方式，須與後端的 `AUTH` 相符：

| `authMethod` | 後端 `AUTH` | 登入頁放置的元件 |
| --- | --- | --- |
| `'none'` | `null` | 沒有登入頁：guard 不作用，`/login` 轉回首頁 |
| `'custom'` | `'password'` 或自行撰寫的模組 | `PasswordLoginForm`。自行撰寫的模組須使用不同的欄位時，修改 `pages/login.vue` |
| `'google'` | Google 的模組 | Google 登入按鈕（🔲 尚未實作） |

| 檔案 | 內容 |
| --- | --- |
| `services/auth/token.ts` | token 的讀寫。<br>・token 存在 `localStorage`，key 帶有 `BASE_URL` 前綴，避免同網域的其他 App 互相覆蓋<br>・另有一份 `shallowRef` 供畫面與 guard 讀取<br>・前端只存 token |
| `services/auth/tokenMessage.ts` | token 中 message 的編碼與解碼。正式的流程不解析 token，只有假後端使用 |
| `router/index.ts` | 全域的 `beforeEach`：<br>・連第一次開啟（直接貼上網址、重新整理）都會經過。沒有 token 時，轉到 `/login?redirect=原目的地`<br>・標示 `meta.public` 的頁面不檢查<br>・另外 `watch` token：token 被清除時，若使用者仍在須登入的頁面，即帶到登入頁，`redirect` 為當時這一頁 |
| `services/appScript.ts` | ・每個請求的網址帶上 `?token=`<br>・後端回傳 `unauthorized` 或 `expired` 時，拋出 `AuthError` 並清除 token<br>・回應附帶續期的 token 時，替換 token<br>・`fetchToken(credentials)`：送出 `{ action: 'login', credentials }`，取回 token<br>・未設定 `VITE_APPS_SCRIPT_URL` 時使用假後端：`mockLogin` 收到任何憑證都視為成功，發出的 token 不簽章。`mockAuthorize` 檢查格式與過期，同樣會續期<br>・開發模式的 console 紀錄遮蔽密碼與登入回傳的 token |
| `composables/auth/useLogin.ts` | 登入頁的資料層：送出（`fetchToken`）、錯誤訊息、成功後存入 token、重抓已載入與載入失敗的表（`store.reload()`，不推送），再以 `replace` 前往 `redirect`。`redirect` 只接受站內路徑 |
| `components/ui/auth/PasswordLoginForm.vue` | 帳號密碼表單，見 [PasswordLoginForm](../vue-build/docs/components/auth/PasswordLoginForm.md) |
| `pages/login.vue` | 登入頁本身，整頁自行排版（置中的卡片、標題、錯誤訊息），表單使用上方的元件。專案要修改外觀（logo、標題、背景、版面）時，直接修改此檔 |
| `components/ui/shell/AppShell.vue` | `meta.shell: false` 的頁面不顯示 App Bar、側邊欄與底部導覽列。`authMethod` 不是 `'none'` 時，側邊欄有「登出」 |

流程：

- **登入頁**：送出憑證，取得 token，存入後前往 `redirect`。登入後的第一頁沒有 App 內的上一頁，因為登入頁已被 `replace` 取代，返回鍵依此判斷
- **收到 `expired` 或 `unauthorized`**：清除 token，由 router 帶到登入頁。登入後回到原本那一頁，用過的表（包括載入失敗的表）重新抓取
- **未推送的佇列一律保留**：重新登入後按同步即可推送。batch 設計為可整批重送，因此安全
- **登出**：有未推送的變更時先詢問，再清除 token，router 同樣帶到登入頁。佇列保留

**可替換的只有登入頁上的表單元件**。改用 Google 登入時，把 `PasswordLoginForm` 換成 Google 的按鈕，取得的 ID token 放進 `credentials` 送出，其餘流程不變。

---

## 示範模組：帳號密碼（`PasswordAuth`）

此模組定位為**沒有 OAuth 時的暫時方案**。帳號只能由管理員在後端手動加入，前端沒有註冊或管理帳號的畫面。

### 儲存位置

| 位置 | 存放的內容 |
| --- | --- |
| Script Properties | `AUTH_SECRET`：簽章 token 用的密鑰，一長串隨機字串<br>`AUTH_USER_<名稱>`：`{ salt, hash }`，一人一筆 |

- Script Properties 只有能編輯此腳本專案的人看得到（專案設定 → 指令碼屬性），也可以直接在該畫面刪除或修改
- 一人一筆的好處：在畫面上即可看到有哪些帳號，並直接刪除

### 管理員手動執行的函數

在 Apps Script 編輯器中執行。編輯器的「執行」按鈕無法傳入參數，因此：
1. 先把帳號與密碼填在 `Auth.gs` 的 `ACCOUNT_USERNAME`、`ACCOUNT_PASSWORD` 兩個常數
2. 從上方選單選擇函數，執行
3. **執行完畢後，須清空密碼**，不留在程式中

可執行的函數：
- `setupSecret()`：產生 `AUTH_SECRET`（兩個 UUID 接起來）。啟用前執行一次，無須填寫常數。重新執行會使所有已發出的 token 失效
- `addUser()`：產生 salt、計算雜湊，寫入 `AUTH_USER_<名稱>`。帳號同名時覆寫，即等於修改密碼
- `removeUser()`：刪除 `AUTH_USER_<名稱>`，只須填寫帳號

也可以不經過函數，直接在「專案設定 → 指令碼屬性」畫面上**刪除**帳號：刪除該帳號的那一筆屬性即可。**新增帳號或修改密碼只能使用 `addUser()`**：屬性的值為 salt 與雜湊結果，無法手動填寫。

### 登入

`credentials` 為 `{ username, password }`。密碼以明文傳送，由 HTTPS 保護。

1. 讀取 `AUTH_USER_<username>`，計算 `SHA256(password + salt)`，與 `hash` 比對
2. 相符即發出 token

- salt 每人各自隨機產生（`Utilities.getUuid()`），修改密碼時也重新產生
- 雜湊結果以 base64 字串存放：`AUTH_USER_<名稱>` 的值為 `{"salt":"…","hash":"…"}`
- 使用 SHA-256：Apps Script 沒有 bcrypt 等密碼專用的雜湊

### token

```
message = { user: 名稱, exp: 後端當時的時間 + 30 天 }    // exp 的單位為秒
payload = base64url(JSON.stringify(message))
token   = payload + "." + base64url(HMAC_SHA256(AUTH_SECRET, payload))
```

- 簽章使用 HMAC 與只有後端持有的 `AUTH_SECRET`，不知道密鑰即無法偽造 token
- 簽章的對象為編碼後的 `payload` 字串，驗證時直接以收到的字串重算，無須把 JSON 重新序列化
- `exp` 以後端的時鐘計算
- base64url 是編碼，不是加密：
  - 用途是讓二進位的簽章與含特殊字元的 JSON 能放進網址，且輸出不含分隔用的 `.`
  - 任何人都能解開並讀取 message，因此 message 中不放任何秘密
  - token 防範的是竄改，不是讀取

### 驗證

1. 以 `.` 拆開 token。對收到的 `payload` 以 `AUTH_SECRET` 重算 HMAC 並比對。不相符，或不是恰好兩段時，即為 `unauthorized`
2. 相符時，才解開 `payload` 讀取 message。解不開或缺少欄位時，同樣為 `unauthorized`
3. 檢查 `exp`，已過期即為 `expired`
4. 檢查 `AUTH_USER_<user>` 仍存在，不存在即為 `unauthorized`
5. 剩餘效期不足一半（15 天）時，發出新的 token（續期）：`authorize` 把新 token 交給 `Api.gs`，由 `respond` 放上信封

- 只要 30 天內使用過一次，即無須重新登入
- 作廢單一使用者：執行 `removeUser`
- 作廢所有 token：重新執行 `setupSecret()`

`AUTH_SECRET` 不存在時，登入與驗證都回傳「尚未設定 AUTH_SECRET」的錯誤。此錯誤沒有 `code`，前端只顯示訊息、不清除 token，提醒管理員先執行 `setupSecret()`。
