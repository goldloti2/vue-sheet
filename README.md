# Google Sheets 後端 + 自訂 GUI App — 框架

用 Google Sheet 當後端、自己寫前端 GUI（外觀仿 AppSheet）的通用框架。

> 這個 repo 的程式碼與文件都由 Claude（Anthropic 的 AI）生成。作者提供想法與需求、確認程式邏輯、在實機上驗證。

- 目前進度與待辦：[ROADMAP.md](ROADMAP.md)
- 新增一張表／一個頁面怎麼做：[vue-build/template/README.md](vue-build/template/README.md)
- 前端的設計與內部運作：[vue-build/README.md](vue-build/README.md)
- 前後端之間的介面：[docs/api.md](docs/api.md)

---

## 目標與整體架構

- **後端**：Google Sheet
- **前端**：自訂 GUI，外觀仿 AppSheet，但不用 low-code builder（自己寫程式）
- **平台**：手機與電腦瀏覽器共用同一份程式碼
- **使用規模**：單人使用

```
[前端 GUI]  ⇄  [Apps Script Web App]  ⇄  [Google Sheet]
靜態託管         驗證/邏輯/CRUD           實際資料儲存
```

Google Sheets 不讓前端裸連（會暴露金鑰，而且每個使用者都要走 Google OAuth 太重），中間一定要有一層 API。

兩端都是「有請求才動」，不需要自己開伺服器：前端 `npm run build` 產出純靜態檔案丟靜態託管，後端 Apps Script 由 Google 代管。

---

## 技術選型

### 後端：Apps Script Web App

在 Sheet 綁定的 Apps Script 寫 `doGet`/`doPost`，部署成網址供前端 fetch。免費、免架站、Google 代管。

**API 配額**（2026，官方文件 https://developers.google.com/workspace/sheets/api/limits）：讀取每分鐘每專案 300 次、每使用者 60 次，寫入同規則，每日無硬性上限。個人使用通常足夠，但 2026 年稍晚起超額會計費，建議做請求節流。

### 前端：Vue 3 + TypeScript

- UI 元件庫 **Vuetify**——AppSheet 本身走 Material Design，用 Material 元件庫最容易神似
  - 配色沿用 Vuetify 預設藍色系，元件密度 comfortable
  - 圖示用 `@mdi/js`（SVG 版，只打包用到的圖示）。Vuetify 內建 UI 圖示走 `vuetify/iconsets/mdi-svg`；App 自訂圖示則具名 import 常數綁 `v-icon` 的 `:icon`，不另外維護全域字串別名表
  - 深色模式：兩套主題都定義在設定裡保留彈性，但目前只啟用 light，不做切換開關
- 路由用 **unplugin-vue-router**（檔案式、型別安全）
- 狀態用 **Pinia**

---

## 怎麼跑起來

前端在 `vue-build/`：

```bash
cd vue-build
npm install
npm run dev     # 開發伺服器
npm run build   # 產出靜態檔案到 dist/
```

跑起來會看到一個可以瀏覽、新增、編輯、刪除的 App，資料來自 `vue-build/src/services/mock/` 的假後端（把 `vue-build/mock/*.csv` 讀進記憶體）——不需要任何設定，但**重整頁面就回到 CSV 的原始內容**。正式的 Apps Script 後端還沒開始寫，見 [ROADMAP.md](ROADMAP.md)。

接下來：

- **想加自己的表** → [vue-build/template/README.md](vue-build/template/README.md)
- **想先搞懂它怎麼運作** → [vue-build/README.md](vue-build/README.md)（前端文件索引，含名詞對照）

---

## 文件

| 文件 | 內容 |
| --- | --- |
| [ROADMAP.md](ROADMAP.md) | 做到哪裡、還有什麼沒做、刻意不做的是什麼 |
| [docs/api.md](docs/api.md) | 前後端之間的介面：CRUD API、後端 Hooks、認證與權限 |
| [vue-build/README.md](vue-build/README.md) | 前端：指令、資料夾、以及底下所有前端文件的索引 |
| [vue-build/template/README.md](vue-build/template/README.md) | 初次設定、新增一張表要複製與修改哪些檔案 |
