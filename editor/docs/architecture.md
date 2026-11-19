# 編輯器的架構

編輯器的服務、介面與預覽之間的分工，以及檔案的讀寫與檢查的運作方式。畫面的用法見 [README.md](README.md)。

---

## 服務與介面

- `npm run editor` 啟動編輯器自己的 Vite dev server。介面與服務由這一個 dev server 提供。
- 服務是 Vite 的外掛，於 `configureServer` 中加上 `/api/` 的處理函數。處理函數以「方法 路徑」的表對應。
- 服務經由 Vite 的 HMR websocket 推送事件：檔案的變動、專案的檔案清單與各表的摘要、檢查的結果、預覽的狀態與輸出。
- 介面只經由 `src/api.ts` 呼叫服務，不自行 `fetch`。
- 路徑一律相對於 repo 的根目錄，以 `/` 分隔。

---

## 資料夾

| 位置 | 職責 |
| --- | --- |
| `server/` | 服務：檔案的範圍與讀寫、監看、language service、檢查、預覽的子程序、新增與刪除表 |
| `server/schema/` | schema 檔的解析與文字修改、`types.ts` 的讀取、`schemas` 的登記、key 的改名 |
| `shared/` | 服務與介面共用的資料形狀與純函數，例如 CSV 的解析、導覽的分組、欄位的修改的比較 |
| `src/` | 介面：Vue 元件、Pinia 的 store、composables |
| `preview/` | 注入預覽頁面的橋接程式 |
| `public/` | 編輯器的圖示 |
| `tests/` | Vitest 的測試 |

- `server/` 與 `shared/` 中由 Node 直接執行的檔案，只使用可移除的型別語法，相對路徑的匯入須寫副檔名。
- 介面的 store：
  - `files`：開過的檔案、未儲存的修改、儲存、連帶的修改、預覽的草稿
  - `problems`：問題分頁的各來源
  - `preview`：預覽的狀態與控制台

---

## 工具與框架的檔案

- 預覽與檢查所用的 `vite`、`typescript`、`eslint` 的設定與外掛、`vue-tsc`，一律以 `vue-build/package.json` 的位置解析，取自 `vue-build/node_modules`。
- 編輯器不匯入專案的檔案。
- 編輯器讀取的框架檔案：
  - `vue-build/src/schema/types.ts`：以 TypeScript 的 parser 讀取，不執行。取得欄位型別、各型別的設定與 `FormatRule` 的設定，以及欄位與 `TableSchema` 的各項設定的說明。
  - `vue-build/src/plugins/colors.ts`：以 Node 執行，取得共用色名於淺色與深色主題的色值。
  - `vue-build/template/table/`：新增表時複製的範本。
- 型別的小視窗與條件式格式的設定，依 `types.ts` 的內容產生。框架新增設定時，表單自動多出該項（見 [forms.md](forms.md) 的「設定的輸入方式」）。

---

## 檔案的範圍

編輯器只讀寫以下的專案檔案。其他路徑的讀寫，服務一律拒絕。

- `vue-build/src/pages/` 中的 `.vue` 與 `.ts`
- `vue-build/src/schema/tables/` 中的各表
- `vue-build/src/schema/index.ts`
- `vue-build/src/composables/actions/` 中的 `use表名Actions.ts`，`useTableActions.ts` 除外
- `vue-build/src/config/navigation.ts`
- `vue-build/src/services/mock/tables.ts`
- `vue-build/mock/` 中的 CSV
- `apps-script/Config.gs`

---

## 讀取與寫入

- 讀取時，服務回傳檔案的內容與內容的 hash。
- 寫入時，介面附上讀取時的 hash。檔案目前的 hash 不同時，服務不寫入，並回傳檔案目前的內容。
- 寫入前，服務以 vue-build 的 ESLint 設定修正格式，只寫入一次。修正後仍有的問題列於問題分頁。
- 服務以 chokidar 監看專案的資料夾。檔案在別處修改或刪除時，服務推送變動，介面依此更新記憶體中的內容。
  - 檔案沒有未儲存的修改時，介面改為顯示新的內容。
  - 檔案有未儲存的修改時，介面保留修改，並顯示提示。
- 新增或刪除檔案，或修改各表的 schema、`schemas` 的登記、測試資料的登記與 CSV 時，服務重送檔案清單與各表的摘要。
- 介面只為目前的檔案建立畫面。其他開過的檔案只保留資料：內容、讀取時的 hash、CodeMirror 的狀態、解析的結果。

---

## schema 檔的修改

- 服務以 TypeScript 的 parser 解析 schema 檔，找出 `Row` 介面與 `TableSchema<Row>` 物件。
- 以字面值寫成的設定轉為表單的值。其他寫法保留原文，於表單中顯示為程式碼。
- 表單的每一次修改是一組修改項目，例如取代值、設定屬性、插入、刪除與移動陣列的項目。服務依序套用，每一項皆重新解析。任一項失敗時，整組都不套用。
- 新增與刪除欄位時，服務同時修改 `columns` 或 `virtualColumns` 與 `Row` 介面。值的型別取自 `types.ts` 的 `ColumnTypes`。虛擬欄位的成員加上 `readonly`。
- 刪除欄位時，服務一併刪除同一檔案中以字串寫成的引用，例如各清單、`labelColumn`、條件式格式的 `columns`。
- 修改 key 時，`Row` 成員的所有引用由 language service 找出，包括 `.vue` 檔。同一檔案中以字串寫成的 key 另行修改。
- 程式碼寫回 schema 前，服務先檢查語法。有語法錯誤時不寫回。
- schema 檔的修改皆為未儲存的修改，按「儲存」才寫入。

---

## 新增與刪除表

- 新增表時，服務複製 `vue-build/template/table/` 的 `schema.ts` 與 `use__Table__Actions.ts`：
  1. 刪除開頭「複製到」的註解。
  2. 取代 `__table__`、`__Table__`、`tableLabel` 與主鍵字首。
  3. 刪除主鍵與稱呼以外的欄位。
  4. 建立只有表頭的 mock CSV。
  5. 登記於 `schemas` 與測試資料的登記。
- 服務先算出全部的內容，任一項失敗時不寫入任何檔案。
- 刪除表時，服務刪除表的檔案與登記。範圍見 [forms.md](forms.md) 的「新增與刪除表」。刪除後，`pages/` 中變空的資料夾一併刪除。
- 新增表、刪除表與建立 CSV 皆立即寫入，不經過介面的未儲存修改。

---

## 預覽

- 預覽是 vue-build 的 dev server，於子程序中執行。子程序以 vue-build 的 Vite 與 `vite.config.mts` 啟動，另加上預覽用的外掛。
- 一次只執行一個子程序。切換資料來源時，服務先停止舊的子程序。
- 資料來源與設定：
  - 本地測試：子程序的環境變數 `VITE_APPS_SCRIPT_URL` 為空字串，覆蓋 `.env` 的網址。
  - 線上測試：Vite 的 mode 為 `fake`，讀取 `vue-build/.env.fake.local`。
  - 線上正式：照常讀取 `vue-build/.env`。
- **草稿**：介面把未儲存的內容送給服務，服務經由 IPC 轉給子程序。子程序的外掛讀取有草稿的檔案時，改用草稿的內容，並觸發熱更新。子程序重新啟動時，服務再送一次全部的草稿。編輯器開啟時，介面清除上次留下的草稿。
- **橋接**：預覽的外掛於 `index.html` 注入 `preview/bridge.ts`。橋接程式以 `postMessage` 把 `console.warn`、`console.error`、未捕捉的錯誤與 Vite 的錯誤送給介面，並接收重新整理的指令。

---

## 檢查

| 來源 | 時機 | 內容 |
| --- | --- | --- |
| **即時檢查** | 停止輸入後 | language service 以未儲存的內容檢查目前的檔案 |
| **ESLint** | 寫入時 | 修正格式後仍有的問題。檔案在別處修改後，不再符合內容的問題即移除 |
| **vue-tsc** | 背景常駐 | 以 watch 模式檢查 `vue-build/tsconfig.app.json` 涵蓋的檔案，不輸出檔案。每次檢查結束時，換成新的問題 |
| **Vite** | 預覽出錯時 | 預覽的 dev server 的錯誤。錯誤消除時移除 |

- **language service**：
  - 於 worker 中執行，型別檢查不佔用服務的執行緒。
  - 以 `vue-build/tsconfig.app.json` 建立專案，未儲存的內容取代磁碟上的檔案。
  - `.vue` 檔經由 vue-tsc 所用的 Vue 語言工具轉為 TypeScript，診斷與補全的位置對應回 `.vue` 的原文。
  - 提供診斷、補全與改名。
- **建置**：按下「vite build」時，服務於子程序中執行 vue-build 的建置，輸出串流至建置分頁。建置中時不重複執行。

---

## 測試

- 測試只讀寫暫存資料夾，不修改 repo 中的檔案。
- 需要 TypeScript、`types.ts` 或範本時，測試從 vue-build 讀取，只讀取。
- 需要專案時，測試於暫存資料夾建立一個小專案。language service 的測試把小專案的 `node_modules` 連結至 vue-build 的套件。
- vue-tsc 與建置以假的函數取代，不啟動子程序。key 改名的測試以假的函數取代 language service。
- store 的測試以假的模組取代 `src/api.ts`。解析由服務端的函數代替，服務的事件由測試直接送出。
