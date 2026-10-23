# 版本紀錄

## v1.6

- **條件式格式**：表層級的 `formatRules` 依條件改變指定欄位的顏色、粗體、斜體、底線、刪除線，或在值前面加上圖示，套用於詳細頁、列表的各版面與表格。說明見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md) 的「條件式格式」
- **建議值改為 `suggestedValues`**：`allowCustom` 的 select 以 `suggestedValues: (row, rows) => 值的清單` 算出建議，接在 `options` 後面；`row` 掛了 getter，可讀父列與同一父列底下的其他子列。說明見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md) 的「建議值」
- **表格的欄寬**：`DataTable` 新增 `widths`，各欄可設為最大（完整顯示，可橫向捲動）、預設（均分剩下的寬度，放不下加「…」）或最小（縮到內容寬，上限為預設欄的一份）；`wrap` 令放不下的格子換行而非截斷；`fixed` 令前幾欄於橫向捲動時固定於左側，欄寬不變。說明見 [vue-build/docs/components/list/DataTable.md](vue-build/docs/components/list/DataTable.md) 的「欄寬」與「固定欄」
- **詳細頁欄位的排法**：標籤與值可左右並排（原本的樣式）或上下兩行。全站預設為 `config/app.ts` 的 `detailFieldLayout`，單一頁面以 `DetailPage` 的 `layout` 覆寫；dashboard 的窄面板不論設定一律上下兩行。說明見 [vue-build/docs/components/record/DetailField.md](vue-build/docs/components/record/DetailField.md)
- 詳細頁標頭的摘要改為與標題同色、與副標同大小，並與上方隔一行；標頭下方加上分隔線
- 是非欄位的按鈕組中，選中的那顆改為主題色的淡色底
- 修正文字排序時數字依字典序排（「10」在「2」之前），現在依數字大小排，分組的先後亦同；選項類的欄位中不在選項裡的值，彼此改為依文字排序

### 不相容的變更

- `select` 的 `suggestFromData` 移除，改寫為 `suggestedValues: (row, rows) => rows.map(other => other.欄位)`
- view 的文字位置（`title`、`subtitle`、`summary`、`aside`）由字串改為 `{ text, format }`；`DetailField` 的 `value` 亦同。只使用內建版面元件的頁面不受影響，直接讀這些值的程式須改讀 `.text`

## v1.5

- **主鍵改為一般欄位上的標記**：`idColumn` 指向 `columns` 中的一欄，其值即為 `row.id`。主鍵可以是 `ref`（與父表共用 id 的一對一延伸表），或由使用者於新增表單填寫；留空時才以 `newId()` 發號，`newId` 改為選用。建立後不能修改，編輯表單中為唯讀；新增時擋下重複的 id。說明見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md) 的「主鍵」
- **表單可顯示虛擬欄位**：排進 `formOrder` 的虛擬欄位於表單中唯讀顯示，隨輸入即時重算
- **`boolean` 欄位**：值為是、否或空，Sheet 上為 `TRUE`／`FALSE`／空白。表單是「否」「是」兩顆互斥的按鈕，篩選抽屜可勾選是、否與「(空白)」。說明見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md) 的「boolean 欄位」
- **沒有子列時刪除父列**：ref 欄位新增 `onEmpty: 'delete'`，子列被刪除或改指別的父列而使原本的父列沒有子列時，父列一起刪。說明見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md) 的「沒有子列時刪除父列」
- **虛擬欄位可以是 `ref`**：`value` 回傳對方的 id，`row.$欄位key` 同樣掛上，顯示、排序與搜尋皆為對方的名稱。只有正向，不進關聯圖
- **欄位新增 `showIf`**，依這一列的資料決定詳細頁是否顯示該欄
- **頁面可覆寫欄位順序**：`DetailPage`／`FormPage`（與 `DataDetail`／`DataForm`）新增 `order`，覆寫 schema 的 `detailOrder`／`formOrder`，例如新增頁與編輯頁使用不同的欄位。`FormPage` 另新增 `lockId`，新增頁的主鍵只能由預設值帶入時可設為唯讀
- **詳細頁的快速編輯**：`DetailPage`／`DataDetail` 新增 `editable`，列出的欄位直接以輸入元件呈現，改了即寫入，不經過編輯頁；打字類的欄位在失焦或按 Enter 時寫入，其餘一改就寫入，驗證不通過時不寫入並顯示錯誤。說明見 [vue-build/docs/components/record/DataDetail.md](vue-build/docs/components/record/DataDetail.md) 的「快速編輯」
- 表單中必填的欄位於名稱後加上紅色的「*」
- 表單中唯讀的欄位（虛擬欄位、建立後的主鍵）字色變淡，主鍵另加鎖頭；日期欄位的日曆圖示移到欄位內右側
- 數字欄位新增 `step`，設定表單上 −／＋ 每次的增減；右側的上下箭頭改為 −／＋
- 列表中 view 指定了但這一列沒有值的位置保留它的位置（文字留一行、縮圖與頭像留空白、card 的大圖以灰色方塊佔位），各列因此對齊；沒指定的位置照舊不顯示。card 的層改為「沒指定任何位置」才隱藏
- 修正數字欄位在表單與篩選抽屜中被四捨五入為整數
- 修正降冪排序時沒有值的列排到最前面；現在不論升冪或降冪皆排在最後

### 不相容的變更

- `idColumn` 由 Sheet 的表頭文字改為 `columns` 中某一欄的 key。各表須在 `columns` 加入主鍵那一欄（例如 `{ key: 'code', label: '編號', sheetHeader: '原本的 idColumn', type: 'text' }`），Row 介面加上該欄，並將 `idColumn` 改為該欄的 key。原本沒有 `formOrder` 的表，新增與編輯表單會多出這一欄，不需要時須補上 `formOrder`

## v1.4

- **Dashboard**：`DashboardPage` 與 `DashboardPanel` 於一頁中同時顯示多個面板，以方格座標排版（手機 6 格、電腦 24 格），點擊面板即成為關注點，面板可就地展開為整頁。面板中可直接放入既有的列表頁與詳細頁；開啟互動（`interactive`）時，點擊一列改為選取，詳細面板顯示選取的那一筆，子表的列表只列出它的子列。面板寬 3 格以下時，列表與詳細頁改用精簡的版面。說明見 [vue-build/docs/design/dashboard.md](vue-build/docs/design/dashboard.md)
- **頁籤中的列表共用搜尋**：`TabPage` 各頁籤中的列表（包括自其他 `.vue` 檔 import 者）共用一條搜尋字串，同一張表共用一份篩選與排序，由 `TabPage` 統一登記。`useListPage` 新增 `scope`，於篩選與搜尋之前只留所需的列。範本見 `vue-build/template/pages/` 的 `tab-list.vue` 與 `_ref/list.vue`
- **只供引用的頁面**：`src/pages/` 中任意層的 `_ref/` 資料夾不產生路由，用於放置只供其他頁面 import 的元件（例如自頁籤頁拆出的列表）
- **文件重新整理**：新增 [vue-build/docs/design/](vue-build/docs/design/README.md)，從使用者看到的畫面介紹各種頁面；元件文件依 `src/components/ui/` 的子資料夾分類；各項機制的說明移至 `vue-build/docs/topics/`
- **換頁動畫改用 View Transitions**：App Bar、底部導覽列、FAB 等外殼維持不動；不支援的瀏覽器，或系統開啟「減少動態效果」時，不播放動畫
- 側邊欄預設為關閉
- `GroupedList` 某一層只有一組時，該組固定展開且不可收合（見 [vue-build/docs/components/list/GroupedList.md](vue-build/docs/components/list/GroupedList.md)）
- 修正 `vue-build/template/table/schema.ts` 中錯誤的 import 路徑
- 詳細頁的欄位值為沒有空白的長字串（網址、編號）時於任意處換行，不再撐開欄位

### 不相容的變更

- `TabView` 改名為 `TabPage`，`TabViewPanel` 改名為 `TabPanel`，兩者皆移至 `components/ui/panel/`。使用頁籤的頁面須修改 import 的路徑與元件名稱
- `@/router` 不再 export `transitionDir`，換頁動畫的方向改寫於 `<html>` 的 `data-dir`

## v1.3

- **視圖（view）**：頁面以 `defineView`（card 為 `defineCardView`）指定一列的哪些欄位放在版面的哪個位置，以及該列的動作；格式化依欄位型別自動處理。說明見 [vue-build/docs/components/list/DataList.md](vue-build/docs/components/list/DataList.md) 的「view」
- **列表的版面**：除 deck（`DataList`）外，新增 profile（`DataProfile`）、card（`DataCard`）與 gallery（`DataGallery`）。皆以 view 呈現，並支援長按多選；gallery 搭配 `ListPage` 新增的 `layout="grid"`，手機上為兩欄。各版面的比較見 [vue-build/docs/design/list.md](vue-build/docs/design/list.md) 的「五種版面」，範本見 `vue-build/template/pages/`
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

- **動作的寫法改版**：內建 builder 改為一般函式，回傳單一動作，不適用時回傳 `null`；各表 `use表名Actions` 的每一項亦為單一動作，同一位置放置哪些動作由頁面組成陣列決定。編輯、刪除等以列為參數的動作改為函式，detail 頁以 `useRowAction` 綁定至當前那一筆。說明集中於新增的 [vue-build/docs/topics/actions.md](vue-build/docs/topics/actions.md)
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
