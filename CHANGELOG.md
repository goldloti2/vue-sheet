# 版本紀錄

## v1.3

- **視圖（view）**：頁面以 `defineView`（card 為 `defineCardView`）指定一列的哪些欄位放在版面的哪個位置，以及該列的動作；格式化依欄位型別自動處理。說明見 [vue-build/docs/components/list/DataList.md](vue-build/docs/components/list/DataList.md) 的「view」
- **列表的版面**：除 deck（`DataList`）外，新增 profile（`DataProfile`）、card（`DataCard`）與 gallery（`DataGallery`）。皆以 view 呈現，並支援長按多選；gallery 搭配 `ListPage` 新增的 `layout="grid"`，手機上為兩欄。各版面的比較見 [vue-build/docs/ui.md](vue-build/docs/ui.md) 的「版面的種類」，範本見 `vue-build/template/pages/`
- **每一列的動作**：view 的 `actions` 依版面呈現於 deck 的下一列、profile 與 gallery 的 ⋮ 選單，或 card 的左右各兩格。`PageAction` 新增 `display`，可選擇以圖示或文字顯示
- **詳細頁的標頭區塊**（選用）：`DetailPage` 新增 `header`，於整頁最上方顯示大圖、標題、副標、摘要與動作
- 列表共用的間距、陰影與點擊、選取的樣式集中於 `vue-build/src/styles/list.css`
- 分組的列表中，卡片的陰影不再被裁切
- 動作選單（包含 App Bar 的 ⋮）的圖示與其他位置同樣深淺，並縮小與文字的間距

### 不相容的變更

依 v1.2 範本撰寫的列表頁需配合修改，修改方式可對照 `vue-build/template/pages/` 的 `list.vue` 與 `child-list.vue`：

- `DataList` 改為接收 `row` 與 `view`，原本各位置的 prop（`title`、`topRight`、`bottomLeft`、`bottomRight`、`image`）移除。各欄位的位置改於頁面以 `defineView` 指定，例如 `defineView(schema, { title: 'name', subtitle: 'date', summary: 'amount' })`
- `formatField` 不再 export，格式化改由 view 處理

### 版本後修正

- `GroupedList` 的分組層 `label` 可回傳 `null`，表示該列於此層不再往下分：同一組中這類的列併成一個沒有標題的子組；整組皆為 `null` 時，外層的那一組仍可收合，展開後直接列出各列（見 [vue-build/docs/components/list/GroupedList.md](vue-build/docs/components/list/GroupedList.md)）

## v1.2

- **動作的寫法改版**：內建 builder 改為一般函式，回傳單一動作，不適用時回傳 `null`；各表 `use表名Actions` 的每一項亦為單一動作，同一位置放置哪些動作由頁面組成陣列決定。編輯、刪除等以列為參數的動作改為函式，detail 頁以 `useRowAction` 綁定至當前那一筆。說明集中於新增的 [vue-build/docs/actions.md](vue-build/docs/actions.md)
- 於 detail 頁刪除當前那一筆後，自動返回上一頁
- 移除內部 helper 不必要的 export

### 不相容的變更

依 v1.1 範本撰寫的表需配合修改，修改方式可對照 `vue-build/template/` 的 `table/use__Table__Actions.ts` 與 `pages/`：

- 內建 builder 的名稱去掉開頭的 `use`（例如 `useEditAction` → `editAction`），並改為一般函式。`use表名Actions` 中不以列為參數的動作以 `useAction` 包裝
- `use表名Actions` 不再接收 `row`：`edit`、`delete` 改為接收一列並回傳動作的函式，detail 頁改寫為 `useRowAction(row, edit)`
- 具預設外觀的 builder，外觀（`label`、`icon`）一律改為最後一個參數
- 頁面交給各位置時須自行組成陣列：`:fab="[editAction]"`、`useAppBarActions(() => [deleteAction.value])`
- `fieldActions` 改為「欄位 key → `(row) => PageAction | null`」
- 部分內部型別與函式不再 export（例如 `PageActions`、`ColumnType`、`AuthMethod`）

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
