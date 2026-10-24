# 前端（vue-build）

使用 Vue 3 + TypeScript + Vuetify + Pinia，路由使用 unplugin-vue-router（檔案即路由）。專案整體的介紹見上一層的 [README.md](../README.md)。

```bash
npm install
npm run dev     # 開發伺服器
npm run build   # 產出靜態檔案至 dist/
npx eslint src && npx vue-tsc --build --force   # 提交前執行這兩項
```

執行 `npm run dev` 後即可操作：
- 資料來自 `src/services/mock/` 的假後端，即把 `mock/*.csv` 讀進記憶體
- 修改即時反映在畫面上，但**重新整理頁面後回到 CSV 的原始內容**
- 接上實際的 Sheet，見 [../apps-script/README.md](../apps-script/README.md)。於 `.env` 填入 `VITE_APPS_SCRIPT_URL` 後，即改為呼叫實際的後端

## 閱讀的起點

| 要做的事 | 從這裡開始 |
| --- | --- |
| 新增一張自己的表 | [template/README.md](template/README.md)：要複製哪些檔案、修改哪幾處 |
| 了解一張表的描述方式 | [docs/topics/schema.md](docs/topics/schema.md) |
| 安排一個頁面 | [docs/design/](docs/design/) 與 [docs/components/](docs/components/) |
| 放置動作、串接連續動作 | [docs/topics/actions.md](docs/topics/actions.md) |
| 了解資料的流向，以及何時寫入 Sheet | [docs/topics/store.md](docs/topics/store.md) |
| 修改框架本身 | [docs/architecture.md](docs/architecture.md) |

## 文件

| 文件 | 內容 |
| --- | --- |
| [docs/topics/schema.md](docs/topics/schema.md) | 資料表的慣例、欄位、跨表關聯、驗證、預設值 |
| [docs/topics/store.md](docs/topics/store.md) | 讀寫的資料流、共用快取、待推送佇列、流程存檔點、離線 |
| [docs/architecture.md](docs/architecture.md) | 模組化的範圍、資料夾、頁面範本的型態 |
| [docs/topics/pages.md](docs/topics/pages.md) | 畫面的外殼、多選與頁籤、KeepAlive 的規則、完成動作後的導覽、離開表單前的確認 |
| [docs/design/](docs/design/) | 各種頁面的外觀、用途與操作，以及設計時須決定的事 |
| [docs/topics/search.md](docs/topics/search.md) | 列表的搜尋、篩選與排序的接法與運作方式 |
| [docs/topics/actions.md](docs/topics/actions.md) | 動作的描述、位置與執行、內建 builder、連續動作、快速編輯對話框 |
| [docs/components/](docs/components/) | 每個共用 UI 元件一份用法說明，依 `src/components/ui/` 的子資料夾分類 |
| [docs/perf.md](docs/perf.md) | 附錄：列表效能的實測數字、量測方法與判讀方式 |
| [template/README.md](template/README.md) | 初次設定，以及新增一張表時須複製與修改的檔案 |
| [../docs/api.md](../docs/api.md) | 前後端之間的介面 |
| [../apps-script/README.md](../apps-script/README.md) | 後端：須填寫的設定、部署方式、實測結果 |

## 名詞

| 名詞 | 意思 |
| --- | --- |
| **表**（table） | 一個 Google Sheet 分頁。前端對應一份 schema |
| **代稱**（table key） | 程式中稱呼一張表的英文字串（例如 `'order'`），也是呼叫 API 時使用的值。Sheet 分頁的實際名稱只有後端知道 |
| **schema** | 一張表的欄位定義：型別、驗證、排序、關聯。見 [docs/topics/schema.md](docs/topics/schema.md) |
| **列**（row） | 表中的一筆資料。id 為主鍵欄的值，由前端決定 |
| **虛擬欄位**（virtual column） | 不存在於 Sheet 上，讀取時才算出的欄位 |
| **父表、子表**（parent / child） | 關聯的兩端。外鍵（`ref` 欄位）放在子表 |
| **快取**（`store.rows`） | store 中每張表一份、全 App 共用的資料。畫面只讀取快取 |
| **佇列**（`pending`） | 尚未寫回 Sheet 的修改。按同步時才實際送出 |
| **推送**（flush） | 把整個佇列以一個請求送至後端，全有全無 |
| **同步**（`refresh`） | 推送，再重抓所有已載入與載入失敗的表，即 App Bar 最右側的按鈕 |
| **版型**（page layout） | `components/ui/page/` 的元件（`ListPage`、`DetailPage`、`FormPage`、`PageState`），包好一種頁面共通的骨架，頁面只填入這張表專屬的部分 |
| **動作**（`PageAction`） | 一個按鈕的定義，可以放在 FAB、App Bar、底部或某個欄位旁 |
| **流程**（flow） | 多個步驟一次完成的動作，中途取消時整條還原 |

## 資料夾

```
src/
  components/ui/   共用元件庫，依用途分為 shell、dialog、list、record、page、panel、view、auth（用法見 docs/components/）
  composables/     依用途分為 data、form、shell、navigation、list、actions、page、auth
  stores/tables/   每張表一份共用快取，以及寫入佇列、列上的 getter
  services/        對後端唯一的出入口（.env 未填網址時使用 mock/ 的假後端，填寫後呼叫真正的後端）
  schema/          處理列的純函數（型別、排序、分組、篩選、驗證、關聯圖）。tables/ 中為每張表的欄位定義
  config/          App 名稱、登入方式、詳細頁欄位的排法、導覽列項目
  plugins/         Vuetify 的設定，包括共用色名
  router/          路由實例、換頁動畫與方向判定
  pages/           檔案即路由
mock/              假後端使用的 CSV
template/          新增一張表時要複製的檔案
```

各資料夾的內容與分法，見 [docs/architecture.md](docs/architecture.md)。
