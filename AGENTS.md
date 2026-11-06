# AGENTS.md

AI agent 在此 repo 中工作時須遵守的規則。只列出任何工作都適用的規則，設計與機制的內容見各份文件。

## 這個 repo

- 以 Google Sheet 為後端、自行撰寫前端的通用框架。介紹見 [README.md](README.md)。
- 前端位於 `vue-build/`：Vue 3、TypeScript、Vite、Vuetify、Pinia，路由使用 unplugin-vue-router（檔案即路由）。指令一律使用 npm。
- 後端位於 `apps-script/`（Apps Script）。前後端之間的介面與認證，見 `docs/`。
- 以框架建立自己的 App 時，框架與專案的檔案位於同一個 repo（見「框架與專案」）。

## 目錄

| 位置 | 內容 |
| --- | --- |
| `vue-build/src/` | 前端的程式。各資料夾的職責見 [vue-build/docs/architecture.md](vue-build/docs/architecture.md) |
| `vue-build/docs/topics/` | 各項機制：schema、store、頁面、動作、搜尋、圖表 |
| `vue-build/docs/components/` | 每個共用元件一份用法說明 |
| `vue-build/docs/design/` | 各種頁面的外觀與用途，以及版面的數值 |
| `vue-build/docs/decisions.md` | 設計理由 |
| `vue-build/template/` | 新增一張表或一個頁面時複製的範本 |
| `vue-build/tests/` | Vitest 的測試，結構對應 `src/` |
| `apps-script/` | 後端的程式與部署方式 |
| `docs/` | 前後端之間的介面與認證 |
| `ROADMAP.md`、`CHANGELOG.md` | 框架的進度與各版本的內容 |

## 驗證

於 `vue-build/` 執行以下四項，全部通過才算完成：
1. `npx eslint src tests`
2. `npx vue-tsc --build --force`
3. `npx vite build`
4. `npm test`

- 不啟動 dev server，不以瀏覽器測試。畫面由使用者確認。
- 測試只使用 `tests/fixtures/` 中的表，不使用 `src/schema/tables/` 中的表。
- 測試不得連線至真正的後端。
- `vue-build/src/typed-router.d.ts` 由路由的外掛產生。提交前確認其中沒有 `_ref` 的項目。

## 框架與專案

- **框架**：`components/ui/`、`composables/`（各表的 `use表名Actions` 除外）、`schema/` 中的共用檔、`plugins/`、`config/app.ts` 的設定項、`template/`、`docs/`、`apps-script/`、`ROADMAP.md`、`CHANGELOG.md`。
- **專案**：`pages/`、`schema/tables/`、各表的 `use表名Actions`、`config/navigation.ts`、`typed-router.d.ts`，以及專案自己的文件。
- 框架與專案的修改分開提交。
- 框架的檔案不得出現專案的字眼，例如表名、欄位名與專案的用詞。程式碼的例子與文件的例子也不得出現。

## 程式

- 新增表或頁面時，先從 `vue-build/template/` 複製對應的範本，再修改。對照表與檢查清單見 [vue-build/template/README.md](vue-build/template/README.md)。
- 少開特例。做類似事情的機制合併為一條路徑。
- 各表獨立。不同表的 schema 與 `use表名Actions` 之間不共用 helper，各表透過 `ref` 欄位的 getter 取得其他表的資料。只匯入型別時不受此限。
- 版面的數值（px、門檻、比例）只寫在 `vue-build/docs/design/` 中。元件的文件與註解只寫概念，並連到 design 文件。
- 修改元件以外的邏輯（`schema/`、`stores/`、`composables/` 中不依賴畫面的部分）時，同一次修改新增或更新對應的測試。
- 測試的寫法（純函數直接呼叫，store 與連動經由假後端）見 [vue-build/docs/architecture.md](vue-build/docs/architecture.md) 的「資料夾」。
- 註解一行，寫規則，不寫理由。防止別人把程式改回直覺寫法的實作限制可以寫在註解中。
- 撰寫 Vue 程式前，先載入 vue-best-practices skill（`.claude/settings.json` 中的 plugin）。

## 文件

- 修改通用的行為時，同一次修改更新 `vue-build/template/` 與相關的文件。
- 寫入 repo 的中文一律使用正式的書面語，包括文件、changelog 與註解。
- 一句一事，不用分號。同一個概念在整份文件中只用一個詞。
- 文件只寫目前的規則與行為。變更的經過寫在 changelog。
- 文件以文字說明，不放程式碼區塊。需要示範寫法時，連到 `vue-build/template/` 中的範本。
- 設計理由只寫在 `vue-build/docs/decisions.md`，標題為「為什麼…」。其他文件與註解不寫理由，也不連到 `decisions.md`。
- 不補充使用者沒有給的事實或理由。

## 提交與版本

- 只在使用者要求時提交，只在使用者要求時推送。
- 完成一批修改時，提出提交的計畫：分幾個提交、各含哪些檔案、訊息。使用者同意後才提交。
- 使用者 stage 檔案代表「已看過」，不代表要提交。不自行 stage 或 unstage。提交時只暫存該提交的檔案，不使用 `git add -A` 或 `git add .`。
- 提交訊息為一行英文，加上前綴：`feat:`、`fix:`、`docs:`、`refactor:`。四者皆不適用時，使用 `chore:`。
- `CHANGELOG.md` 的版本草稿與 `ROADMAP.md` 的修改，留到發版時才提交。
- 每次發版升 minor 版本號，含不相容的變更時也一樣。不相容的變更列於 changelog 該版本的「不相容的變更」。
