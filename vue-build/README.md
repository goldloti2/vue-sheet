# 前端（vue-build）

Vue 3 + TypeScript + Vuetify + Pinia，路由用 unplugin-vue-router（檔案即路由）。專案整體介紹見上一層的 [README.md](../README.md)。

```bash
npm install
npm run dev     # 開發伺服器
npm run build   # 產出靜態檔案到 dist/
npx eslint src && npx vue-tsc --build --force   # 提交前跑這兩個
```

`npm run dev` 起來就能操作：資料來自 `src/services/mock/` 的假後端（把 `mock/*.csv` 讀進記憶體），改了會即時反映在畫面上，但**重整頁面就回到 CSV 的原始內容**——正式的 Apps Script 後端還沒接上。

## 從哪裡開始看

| 你想做什麼 | 從這裡開始 |
| --- | --- |
| 加一張自己的表 | [template/README.md](template/README.md)（複製哪些檔、改哪幾處） |
| 搞懂一張表怎麼描述 | [docs/schema.md](docs/schema.md) |
| 排一個頁面、擺動作 | [docs/ui.md](docs/ui.md) + [docs/components/](docs/components/) |
| 知道資料怎麼流動、什麼時候才寫進 Sheet | [docs/store.md](docs/store.md) |
| 改框架本身 | [docs/architecture.md](docs/architecture.md) |

## 文件

| 文件 | 內容 |
| --- | --- |
| [docs/schema.md](docs/schema.md) | 資料表慣例、欄位、跨表關聯、驗證、預設值 |
| [docs/store.md](docs/store.md) | 讀寫資料流、共用快取、待推送佇列、流程存檔點、離線 |
| [docs/architecture.md](docs/architecture.md) | 模組結構、KeepAlive 的規則、完成動作後的導覽與連續流程 |
| [docs/ui.md](docs/ui.md) | 外殼與導覽、列表、動作擺在哪裡、搜尋與篩選 |
| [docs/components/](docs/components/) | 每個共用 UI 元件一份用法說明 |
| [template/README.md](template/README.md) | 初次設定、新增一張表要複製與修改哪些檔案 |
| [../docs/api.md](../docs/api.md) | 前後端之間的介面（後端還沒實作） |

## 名詞

| 名詞 | 意思 |
| --- | --- |
| **表**（table） | 一個 Google Sheet 分頁。前端這邊對應一份 schema |
| **代稱**（table key） | 程式裡稱呼一張表的英文字串（`'order'`），跟 Sheet 分頁的實際名稱分開 |
| **schema** | 一張表的欄位定義：型別、驗證、排序、關聯。見 [docs/schema.md](docs/schema.md) |
| **列**（row） | 表裡的一筆資料。id 由前端產生 |
| **虛擬欄位**（virtual column） | 不存在 Sheet 上、讀的時候才算出來的欄位 |
| **父表／子表**（parent / child） | 關聯的兩端。外鍵（`ref` 欄位）放在子表 |
| **快取**（`store.rows`） | store 裡每張表一份、全 App 共用的資料。畫面只讀它 |
| **佇列**（`pending`） | 還沒寫回 Sheet 的改動。按推送才真的送出去 |
| **推送**（flush） | 把佇列送到後端 |
| **同步**（`refresh`） | 推送 + 重抓所有已載入的表，就是 App Bar 最右邊那顆鈕 |
| **動作**（`PageAction`） | 一顆按鈕的定義，可以擺在 FAB、App Bar、底部或某個欄位旁 |
| **流程**（flow） | 好幾個步驟一氣呵成的動作，中途取消會整條還原 |

## 資料夾

```
src/
  components/ui/   共用元件庫，依用途分成 shell / dialog / list / record（用法見 docs/components/）
  composables/     依用途分成 data / form / shell / navigation / list / actions
  stores/tables/   每張表一份共用快取 + 寫入佇列 + row 上的 getter
  services/        對後端唯一的出入口；mock/ 是假後端，正式後端接上後整個刪掉
  schema/          每張表的欄位定義，加上型別、驗證、關聯圖
  config/          App 名稱與導覽列項目
  router/          路由實例與轉場方向判定
  pages/           檔案即路由
mock/              假後端用的 CSV
template/          新增一張表要複製的檔案
```

每個資料夾裡有什麼、為什麼這樣分，見 [docs/architecture.md](docs/architecture.md)。
