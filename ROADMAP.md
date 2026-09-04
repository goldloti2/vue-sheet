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
- Schema.gs、SheetUtils.gs（header 對應、row array ↔ object；ID 改由前端產生，後端不發）
- Validation.gs：只做安全性與結構完整性（id 不重複、目標存在、表名與欄位名在 schema 內），不做合法性驗證
- Hooks 機制（見 README 4.7）
- 前端 `appScript.ts` 從假後端換成真的 fetch

### 後端 API 介面（已定案，還沒實作）

五個動作，單筆與批次成對：

| 動作 | payload | 回傳 |
| --- | --- | --- |
| `create` | `{ id, ...values }` | 新建那筆 |
| `update` | `{ id, ...values }` | 更新後那筆 |
| `delete` | `{ id }` | `{ id }` |
| `bulkUpdate` | `{ ids, data }` | 更新後的多筆 |
| `bulkDelete` | `{ ids }` | `{ ids }` |

- **ID 由前端產生**（`create` 的 payload 帶 id）。這讓重送變成冪等的：`create` 定義成「id 不存在就建、已存在就當作已完成」，整批重送是安全的，不需要記錄哪幾筆成功過。也讓待推送佇列可以直接用 `table + id` 當 key，因為不會出現「刪掉又新增同一個 id」
- 後端仍然要擋重複 id——Sheet 可以手動打開來改，不能假設 id 只由前端產生
- `bulkUpdate { ids, data }` 的語意是「多筆的指定欄位改成同一個值」，對應批次快速編輯。後端可以直接落到一次 `sheet.getRangeList([...]).setValue(...)`
- `bulkCreate`：等真的有匯入需求再說
- **累積寫入需要通用 batch 端點**（一次請求帶多個操作）。因為佇列裡每筆的值都不同，`bulkUpdate { ids, data }` 涵蓋不了，硬拆成 N 次 `update` 就失去批次的意義

> 註：每分鐘 60 次寫入是 Sheets REST API 的配額，用 Apps Script 內建的 `SpreadsheetApp` 並不適用。批次要省的是**每次 Web App 請求的 script 冷啟成本（約 0.5～2 秒）**，不是配額。

### 累積寫入（設計已定，還沒實作）

改動先累積在前端，由使用者按「推送」才一次寫進 Sheet。

**已決定**
- 手動推送鈕 + 醒目的「尚有未推送變更」標記。使用者無視標記就關掉分頁的話不管他，但另外用 `beforeunload` 彈瀏覽器原生的離開確認（同步的，成本近乎為零）
- **`refresh` 前一定要先 flush**。否則重抓整表會無聲蓋掉未推送的變更
- flush 失敗就保持「未推送」狀態並顯示錯誤，讓使用者重按。因為 id 由前端發，整批重送是安全的——**不要**去做「記錄哪幾筆成功了」的逐筆補償邏輯
- 跨表寫入順序無所謂。Sheet 沒有外鍵約束，後端也不做合法性驗證（見下），所以父表子表誰先寫都不會壞
- 操作合併規則：同一筆的多次 `update` 合併成一次；`create` 後又 `update` 併進那個 `create`；`create` 後 `delete` 整組移除、根本不用送；`update` 後 `delete` 只留 `delete`

**佇列形狀**
```ts
pending: Map<TableKey, Map<id, { kind: 'create' | 'update' | 'delete', values: Partial<Row> }>>
```
快取（`rows`）仍然是**畫面**的單一真相，寫入時照樣就地更新；佇列是**要送什麼**的單一真相。`values` 只累積寫過的欄位，同一筆再改就 shallow merge，不需要跟原始資料做 diff，也不用多留一份快照。上面的合併規則就是這個 map 上的操作，發生在寫入當下而不是 flush 時。

表單一律送整列（不做最小差集），所以 `update` 的 `values` 會是整列——payload 大一點，但省掉在 `useEditForm` 裡比對原始值的複雜度。之後真的需要再優化。

### 資料一致性
- 前端驗證：目前送出前完全沒有檢查。**做累積寫入的前置條件**——累積模式下錯誤要到按推送才會爆，那時使用者已經離開表單很久了
- 驗證的分工已定案，見 [README 4.5](README.md#45-schema-的角色)：合法性只在前端做，一份 schema 推導出的驗證函式用在 form 層（即時提示）與 store 寫入層（擋程式 bug）兩處；後端只做安全性與結構完整性
- 樂觀鎖定：`updatedAt` 欄位與衝突提示都還沒做

### UI 功能
- 搜尋列、篩選、排序的操作介面（目前排序只有 schema 的 `defaultSort`，使用者不能自己改）
- `ref` 欄位的關聯選擇器：`DataForm` 目前把 `ref` 當純文字輸入，應該換成從對方表撈資料的下拉選單
- 圖片欄位與上傳（存 Google Drive）
- 總覽頁範本（`DataDashboardTemplate`）：保留了位置但沒有具體需求
- 分頁（`TabBar`）切換的左右動畫
- 底部導覽列切換頁面的左右動畫

### 多選與批次
- 批次快速編輯：把選取的多筆的指定欄位改成同一個值。`bulkUpdate` 目前只有假後端與 `mutateTable` 支援，store 沒有對應 action，也沒有 UI 入口
- 多選模式不要自動取消，改成右上角出現 X 才關閉
- 全選（考慮中）

### 動作與表單
- 新增時自動填入預設值
- 連續 action：做完不返回上一頁，直接接著下一個 action
- 指定某個 action 結束後要回哪一頁（可能跟連續 action 一起設計）

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
