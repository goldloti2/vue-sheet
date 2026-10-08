# 版本紀錄

## v1.1

- **登入**（選用）：前端有登入頁與導向（`config/app.ts` 的 `authMethod`），後端是可替換的認證模組（`Config.gs` 的 `AUTH`）。附帳號密碼的示範模組：密碼加鹽雜湊、token 有 HMAC 簽章、效期 30 天並自動續期。見 [docs/auth.md](docs/auth.md)
- 同步時會重試第一次就載入失敗的表

不用登入的話不需要做任何事：`AUTH` 與 `authMethod` 的預設值都是不驗證，舊的後端也能繼續用。

## v1.0

前後端都已完整，可以對實際的 Google Sheet 讀寫。

- **後端**：`apps-script/` 的 Apps Script，只需要填 `Config.gs`
- **前端**：只要寫 schema 與頁面就能接上一張表，範本在 `vue-build/template/`

每張表可用的頁面：

| 頁面 | 說明 |
| --- | --- |
| 列表 | 卡片式（對應 AppSheet 的 deck）或表格式（table），可分組、分頁籤、搜尋、篩選、排序、長按多選 |
| 詳細 | 欄位區，加上左右滑動換筆、子表區塊 |
| 子表展開 | 詳細頁裡子表區塊的完整列表 |
| 新增／編輯 | 依欄位型別自動產生的表單 |

### 版本後修正

- 新增／編輯頁的轉場動畫沒有作用，並出現 Vue 警告
- 頁面轉場的離場方向有時跟進場相反
- 上千列的列表換頁、首次開啟變快（量測見 [vue-build/docs/perf.md](vue-build/docs/perf.md)）
