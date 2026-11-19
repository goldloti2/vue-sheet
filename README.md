# Google Sheets 後端 + 自訂 GUI App：框架

以 Google Sheet 作為後端、自行撰寫前端 GUI（外觀仿 AppSheet）的通用框架。

> 此 repo 的程式與文件皆由 Claude（Anthropic 的 AI）產生。作者提供想法與需求、確認程式邏輯，並在實機上驗證。

- 目前的進度與待辦：[ROADMAP.md](ROADMAP.md)
- 各版本的內容：[CHANGELOG.md](CHANGELOG.md)
- 新增一張表或一個頁面的做法：[vue-build/template/README.md](vue-build/template/README.md)
- 前端的設計與內部運作：[vue-build/README.md](vue-build/README.md)
- 前後端之間的介面：[docs/api.md](docs/api.md)
- 認證：[docs/auth.md](docs/auth.md)
- 後端的設定與部署：[apps-script/README.md](apps-script/README.md)
- 修改專案檔案的編輯器：[editor/docs/README.md](editor/docs/README.md)
- AI agent 的工作規則：[AGENTS.md](AGENTS.md)

---

## 目標與整體架構

- **後端**：Google Sheet
- **前端**：自訂 GUI，外觀仿 AppSheet，但不使用 low-code builder，自行撰寫程式
- **平台**：手機與電腦的瀏覽器共用同一份程式
- **使用規模**：單人使用

```
[前端 GUI]  ⇄  [Apps Script Web App]  ⇄  [Google Sheet]
靜態託管         驗證／邏輯／CRUD          實際的資料儲存
```

中間必須有一層 API：Google Sheets 不允許前端直接連線，否則會暴露金鑰，而每個使用者都經過 Google OAuth 又太繁重。

兩端都是「有請求才執行」，無須自行架設伺服器：
- 前端以 `npm run build` 產出純靜態檔案，放到靜態託管
- 後端的 Apps Script 由 Google 代管

---

## 技術選型

### 後端：Apps Script Web App

在 Sheet 綁定的 Apps Script 中撰寫 `doGet`、`doPost`，部署為網址供前端 fetch。免費、無須架站、由 Google 代管。

**配額**（2026）：存取 Sheet 有兩條路，配額各自不同。

| | 配額 | 此框架 |
| --- | --- | --- |
| **Apps Script 內建的 `SpreadsheetApp`** | 個人帳號：單次執行最多 6 分鐘，每天累計執行 90 分鐘，每天讀寫 50 萬次 | ✅ 使用這條 |
| **直接呼叫 Google Sheets API**（不經過 Apps Script，與 OAuth 一樣須另外申請） | 每個專案每分鐘 300 次，每個使用者每分鐘 60 次，讀寫同一規則（[官方文件](https://developers.google.com/workspace/sheets/api/limits)）。2026 年稍晚起，超額將計費 | 不適用 |

因此須注意的是 Apps Script 的執行時間，不是每分鐘的次數：每個請求都是一次執行。前端把多筆修改合成一個 batch 送出，也是為了減少執行次數（見 [docs/api.md](docs/api.md)）。

### 前端：Vue 3 + TypeScript

- UI 元件庫為 **Vuetify**：AppSheet 本身採用 Material Design，使用 Material 元件庫最容易相似
  - 配色沿用 Vuetify 預設的藍色系，元件密度為 comfortable
  - 圖示使用 `@mdi/js`，即 SVG 版，只打包用到的圖示。Vuetify 內建的 UI 圖示使用 `vuetify/iconsets/mdi-svg`。App 自訂的圖示以具名 import 的常數綁定 `v-icon` 的 `:icon`，不另外維護全域的字串別名表
  - 深色模式：依系統的設定自動切換（`defaultTheme: 'system'`）
- 路由使用 **unplugin-vue-router**，檔案式、型別安全
- 狀態管理使用 **Pinia**

---

## 執行方式

前端位於 `vue-build/`：

```bash
cd vue-build
npm install
npm run dev     # 開發伺服器
npm run build   # 產出靜態檔案至 dist/
```

執行後即可看到一個能瀏覽、新增、編輯、刪除的 App：
- 資料來自 `vue-build/src/services/mock/` 的假後端，即把 `vue-build/mock/*.csv` 讀進記憶體
- 無須任何設定，但**重新整理頁面後回到 CSV 的原始內容**

接上實際的 Sheet：
1. 後端位於 `apps-script/`：將所有 `.gs` 檔貼進 Apps Script，填妥 `Config.gs`，再部署
2. 前端於 `.env` 填入 `VITE_APPS_SCRIPT_URL`

整條路徑已對實際的 Sheet 完成測試，結果見 [apps-script/README.md](apps-script/README.md) 的「實測結果」。限制使用者的方式，見該檔的「認證」。

接下來：

- **新增自己的表** → [vue-build/template/README.md](vue-build/template/README.md)
- **先了解運作方式** → [vue-build/README.md](vue-build/README.md)：前端的文件索引，含名詞對照
- **接上真正的 Sheet** → [apps-script/README.md](apps-script/README.md)

### 前端的部署

`npm run build` 產出的 `vue-build/dist/` 為純靜態檔案，可放到任何靜態託管。託管須把找不到的路徑改回傳 `index.html`，由前端的路由處理（SPA fallback）。以下為 Cloudflare Workers 的做法，只上傳靜態檔案，沒有伺服器端的程式。

1. 於 `vue-build/` 建立 `wrangler.jsonc`，並提交至要部署的分支。須設定的項目：
   - `name`：Worker 的名稱
   - `compatibility_date`：建立此檔的日期
   - `assets.directory`：`./dist`
   - `assets.not_found_handling`：`single-page-application`，即 SPA fallback
   - 不設定 `main`
2. 於 Cloudflare 的 Workers & Pages 匯入 GitHub 的 repo。Cloudflare 的 GitHub App 只授權這一個 repo
3. 填寫建置的設定：
   - 根目錄：`vue-build`
   - 建置指令：`npm run build`。此指令也執行型別檢查，型別錯誤時不部署
   - 部署指令：`npx wrangler deploy`
   - 建置的變數（Build variables）：`VITE_APPS_SCRIPT_URL` 為 `.env` 中的網址，`NODE_VERSION` 為 Node 的主版本號
4. 於 Branch control 指定部署的分支，並關閉其他分支的建置
5. 部署完成後，於 Deployments 查看建置的紀錄，再開啟 `workers.dev` 的網址

- 沒有 `wrangler.jsonc` 時，`npx wrangler deploy` 會自動改寫專案的 Vite 設定，建置因此失敗。
- `VITE_APPS_SCRIPT_URL` 須設定為建置的變數。執行時的變數（Variables and Secrets）在建置時讀不到。
- Apps Script 的網址改變時，`.env` 與 Cloudflare 的建置變數皆須更新。修改既有的部署時網址不變，新增部署時網址改變。

**限制可以開啟網站的人**：使用 Cloudflare Zero Trust 的 Access，免費方案即可。另一種做法為後端的認證，見 [apps-script/README.md](apps-script/README.md) 的「認證」。
1. 建立一個 Allow 的 policy，只包含允許的使用者
2. 建立一個 Bypass 的 policy，Include 為 Everyone
3. 以整個網站建立一個 Self-hosted 的 application，套用 Allow 的 policy
4. 於同一個網域再建立一個 application，路徑為 `manifest.webmanifest` 與 `icons`，套用 Bypass 的 policy
5. 以無痕視窗確認：首頁顯示 Cloudflare 的登入畫面，`/manifest.webmanifest` 直接顯示 JSON

- 瀏覽器讀取 manifest 時不帶 cookie。沒有第 4 步時，加入主畫面只會成為一般的書籤。
- iPhone 主畫面上的 App 不與 Safari 共用 cookie，第一次開啟時須在 App 中再登入一次。

### 編輯器

編輯器位於 `editor/`，是於本機執行的網頁 App，用來修改專案的檔案，並即時預覽修改的結果：
1. 於 `vue-build/` 執行 `npm install`。編輯器的預覽與檢查使用 `vue-build/` 中的套件
2. 於 `editor/` 執行 `npm install`，再執行 `npm run editor`
3. 以瀏覽器開啟終端機顯示的網址

用法見 [editor/docs/README.md](editor/docs/README.md)。

---

## 文件

| 文件 | 內容 |
| --- | --- |
| [ROADMAP.md](ROADMAP.md) | 目前的進度，以及尚未完成的項目 |
| [CHANGELOG.md](CHANGELOG.md) | 各版本的內容 |
| [docs/api.md](docs/api.md) | 前後端之間的介面：CRUD API、後端 Hooks、認證與權限 |
| [docs/auth.md](docs/auth.md) | 認證：前後端的約定、可替換的認證模組、帳號密碼的示範模組 |
| [apps-script/README.md](apps-script/README.md) | 後端：須填寫的設定、部署方式、實作上的規則、實測結果 |
| [vue-build/README.md](vue-build/README.md) | 前端：指令、資料夾，以及所有前端文件的索引 |
| [vue-build/template/README.md](vue-build/template/README.md) | 初次設定，以及新增一張表時須複製與修改的檔案 |
| [editor/docs/README.md](editor/docs/README.md) | 編輯器：啟動方式、版面、儲存的規則，以及編輯器的文件索引 |
