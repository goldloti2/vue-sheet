# 框架進度

這份只追蹤**通用框架**的狀態。這個專案自己的表與頁面見 [PROJECT-ROADMAP.md](PROJECT-ROADMAP.md)（只存在於 production 分支）。

設計說明見 [README.md](README.md)。

---

## 已完成

### 前端骨架
- Vue 3 + TypeScript + Vuetify，unplugin-vue-router 檔案式路由，Pinia
- `AppShell`：頂部 App Bar（標題來自 `route.meta.title`）+ 底部導覽列 + 側邊欄空殼
- App Bar 左側圖示依路由自動切換漢堡選單／返回箭頭
- 頁面前進/後退轉場動畫，方向依路徑深度判斷
- 列表頁 `<KeepAlive>` 保留展開與捲動狀態

### Schema 型別系統
- `SchemaColumn` / `TableSchema` 型別，`type` 支援 `text`／`number`／`date`／`ref`／`select`
- `coerceRow`（後端字串 → 前端型別）與 `serializeRow`（反向）
- `formatColumnValue` / `formatField` 顯示格式化
- `columnValues`（組送出用 payload）、`emptyRow`（新增表單起始值）
- `sortRows`（依 `defaultSort`）、`sortByKey`、`groupRows`（多層分組）
- `detailOrder` / `formOrder` 分別控制詳細頁與表單頁的欄位順序

### 跨表關聯
- `schema/relations.ts` 掃 schema 的 `ref` 欄位自動產生關聯圖，新增關聯只要標 `type: 'ref'`
- `DataDetail` 對 `ref` 欄位自動產生連到對方 detail 頁的連結
- `useRelatedRows(子表, 父表)` 依關聯圖解析外鍵欄位，整表撈一次後在前端分組

### 資料存取
- `stores/tables.ts`：每張表一份全 App 共用的快取，同一張表不會重複打 API
- `useTableList` / `useSortedTableList` / `useTableRow` / `useRelatedRows` 都讀同一份
- 寫入走 store 的 `create` / `update` / `remove` / `removeMany`，成功後就地更新快取，呼叫端不用手動 refresh
- 跨表算出來的值靠共用快取的 reactivity 自動重算，不需要跨表失效機制

### 共用元件庫
- 列表：`DataList`（卡片式單列，含長按多選）、`ListField`、`GroupedList`（多層可收合分組）、`DataTable`（表格式，也用於 detail 頁內嵌子表格）
- 詳細：`DataDetail`（自帶 loading/error/找不到資料）、`DetailField`
- 表單：`DataForm`（依 `column.type` 自動選輸入元件）
- 其他：`PageFab`、`TabBar`、`AppDialog`、`ConfirmDialog`

### 動作系統
- `PageAction` 型別，FAB 與 App Bar 共用同一種描述
- 通用 builder：`useNewAction` / `useEditAction` / `useDeleteAction` / `useBulkDeleteAction`
- `useAppBarActions()` 用 provide/inject 把動作註冊到 App Bar，數量多自動收成下拉選單
- `PageFab` 依數量自動在固定顯示與 speed-dial 之間切換

### 表單與多選
- `useCreateForm` / `useEditForm` 收掉新增與編輯的重複邏輯（起始值、載入、送出、導覽、錯誤狀態）
- `useMultiSelect` + `useLongPress`：長按進入多選，選取狀態由「有沒有選取任何一筆」推導
- 批次刪除搭配 `ConfirmDialog`

### 路由
- `useRouteId()` 解決 KeepAlive 下 `[id]` 頁面拿到過期或 `undefined` 參數的問題
- `leaveAfterAction()`：完成動作後用瀏覽器返回離開，不把已完成的表單頁留在歷史裡

### 假後端
- `services/mock/`：記憶體資料表 + 可運作的 create/update/delete/bulkUpdate，跟真 Sheet 一樣只存原始字串
- 純記憶體，重整頁面回到 CSV 原始內容
- `services/appScript.ts` 是對後端唯一的出入口，上線時只要換掉這兩個函式的主體、刪掉 `mock/`

### 範本
- `template/`：新增一張表所需的全套檔案 + 每個 UI 元件的用法說明

---

## 未完成

### 後端（完全還沒開始）
- Apps Script 的 `doGet`/`doPost` 入口與泛用 CRUD 引擎
- Schema.gs、SheetUtils.gs（header 對應、ID 產生、row array ↔ object）
- Validation.gs：依 column type/required 的泛用驗證
- Hooks 機制（見 README 4.7）
- 前端 `appScript.ts` 從假後端換成真的 fetch

### 資料一致性
- 前端驗證：目前送出前完全沒有檢查
- 樂觀鎖定：`updatedAt` 欄位與衝突提示都還沒做

### UI 功能
- 搜尋列、篩選、排序的操作介面（目前排序只有 schema 的 `defaultSort`，使用者不能自己改）
- `ref` 欄位的關聯選擇器：`DataForm` 目前把 `ref` 當純文字輸入，應該換成從對方表撈資料的下拉選單
- 圖片欄位與上傳（存 Google Drive）
- 總覽頁範本（`DataDashboardTemplate`）：保留了位置但沒有具體需求
- `bulkUpdate` 只有假後端與 `mutateTable` 支援，store 沒有對應 action，也沒有 UI 入口

### PWA 與離線
- manifest.json、Service Worker 都還沒建立（`vite-plugin-pwa` 未安裝）
- App 名稱、圖示都還沒決定
- 離線寫入佇列：明確決定不做，之後有需求再說

### 桌面版
- 桌面版導覽 UI 待定：要不要改成側邊欄常駐、底部導覽列要不要在桌面隱藏，等要做桌面體驗時再決定

### 部署
- 前端靜態託管（Vercel / Cloudflare Pages，注意 SPA fallback）
- 後端 Apps Script 部署與存取權限設定
- API 配額用量監控

---

## 已知的權宜作法

這些不是待辦，是「現在這樣做，但知道為什麼不理想」的紀錄。

- **`refTable` 沒有型別檢查**：只存代稱字串，不保證真的存在於 `schemas`。為了避免 `schema/types.ts` 反向 import `schema/index.ts` 造成循環依賴，先接受
- **`template/` 不在 `src/` 底下**，所以不會被 lint 與型別檢查掃到，元件 props 改了範本不會自動報錯。目前靠「把範本複製成一張暫時的表、建置過再刪掉」手動驗證
- **刪除時會閃一下「找不到這筆資料」**：快取更新後、返回動畫還在跑的期間，detail 頁的 row 已經是 null。因為那筆資料確實已經不存在，語意上可接受，所以沒有為它增加凍結顯示的機制
