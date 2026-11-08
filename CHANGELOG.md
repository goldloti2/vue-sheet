# 版本紀錄

## v1.11

- **表單層**：新增與編輯的表單改為蓋在目前頁面上的一層，不再是路由頁面。下方的頁面不離開，捲動位置與展開的面板皆保留。說明見 [vue-build/docs/topics/pages.md](vue-build/docs/topics/pages.md) 的「表單層」
  - `openForm(table, options?)` 開啟一張表單。送出時回傳寫入後的列，取消時回傳 `null`
  - 表單只能由點擊開啟。重新整理與直接輸入網址都不會開啟表單
  - 每層佔 history 的一格。返回鍵只關閉最上層
  - 快速編輯對話框（`askFields`）與流程的步驟（`runStep`）使用同一個堆疊
- **選擇器中新增父列**：ref 欄位新增 `allowCreate`。表單的選擇器清單最上方多一項「新增…」，開啟父表的新增表單，送出後回到原表單並選取新的列。只支援一層，快速編輯不提供。說明見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md) 的「選擇器中新增父列」
- **`newAction` 的 `lockId`**：主鍵只能由 `defaults` 帶入時，以 `lockId` 將主鍵設為唯讀

### 不相容的變更

- 新增與編輯的路由（`/表名/new`、`/表名/:id/edit`）移除。各表的 `new.vue` 與 `[id]/edit.vue` 須刪除。範本 `template/pages/new.vue`、`template/pages/edit.vue` 移除。`newAction`、`editAction` 改為依 schema 開啟表單層，呼叫端無須修改
- `FormPage` 移除。以 `order`、`lockId` prop 覆寫的頁面，改為傳入 `openForm` 的同名選項。在表單下方放置額外內容的頁面，改為傳入 `openForm` 的 `content`
- `runStep(to, defaults?)` 改為 `runStep(table, options?)`，`options` 與 `openForm` 相同。例如 `runStep('/表名/new', defaults)` 改為 `runStep('表名', { defaults })`。`resumeStep`、`hasEarlierSteps` 移除
- `useCreateForm`、`useEditForm` 改為只供表單層使用，參數改變
- `useBottomActions`、`useLeaveGuard`、`useSyncHold` 移除。離開前的詢問與同步的停用由表單層處理
- `@/router` 的 `pushWithDefaults`、`navigationDefaults` 移除。預設值改由 `openForm` 的 `defaults` 傳入
- `actionIcons` 的 `cancel`、`save` 移除

## v1.10

- **關聯選擇器的順序**：ref 欄位新增 `refSort`。選項先依 `refSort`，再依父表的 `defaultSort` 排序，父表的列表不受影響
- **關聯選擇器的條件式格式**：選項與選取的值套用父表 `labelColumn` 那一欄的規則。輸入文字搜尋時，選項中符合的文字不再另外標示
- **複製動作**：新增內建 builder `copyAction`。確認後複製一列，主鍵重新發號，其餘真實欄位照抄，完成後前往新的一列
- **圖例**：同一張圖有多個數值且沒有系列時，點擊圖例改為只看勾選的數值，可複選，全部取消時全部顯示。原本為隱藏點擊的數值

## v1.9

- **測試**：加入 Vitest。`npm test` 執行 `vue-build/tests/` 中的測試。說明見 [vue-build/docs/architecture.md](vue-build/docs/architecture.md) 的「資料夾」
  - 純函數：`schema/` 的型別轉換、篩選、排序、驗證、分組、關聯、條件式格式、圖片與圖表的統計，圖表的文字與顏色，搜尋，儀表板面板的排版，表格的欄寬計算，假後端的 CSV 解析與 token
  - 經由假後端：store、佇列、row 上的 getter 與儀表板的連動。測試用的表與資料在 `tests/fixtures/backend/`，不使用專案的表
  - 測試不讀取 `.env`，並替換 `fetch`，請求不會送到真的後端
- **AI agent 的工作規則**：根目錄新增 [AGENTS.md](AGENTS.md)，取代 `vue-build/AGENTS.md`。內容為驗證的指令、框架與專案的區分、程式與文件的規則、提交與版本。根目錄的 `CLAUDE.md` 只匯入 `AGENTS.md`

## v1.8

- **頁籤列畫在頁籤頁之中**：`TabPage` 在自己的最上方畫出頁籤列，捲動時固定於 App Bar 的下緣，不再登記於 App Bar 的 extension。切換頁籤時頁籤列不動，換頁時頁籤列隨頁面滑動。位於儀表板未展開的面板中時，頁籤列固定於面板的上緣。說明見 [vue-build/docs/components/panel/TabPage.md](vue-build/docs/components/panel/TabPage.md)
- **面板的作用中狀態與外層合併**：`TabPanel` 與 `DashboardPanel` 只在自己與外層的面板皆作用中時，才算作用中
- **頁籤頁與儀表板可以互相嵌套**：儀表板的面板中可以放入頁籤頁，頁籤頁的頁籤中也可以放入儀表板。關注含頁籤頁的面板時，App Bar 的搜尋、篩選與排序操作該頁籤頁自己的一份，關注其他面板時回到儀表板共用的一份。容器以新的 `relaySlot` 收下內容的登記，再決定交給 App Bar 的值。`DashboardPage` 仍不可嵌套自身，`TabPage` 不支援直接嵌套自身
- **儀表板的連動改由頁面手動接線**：頁面以 `useDashboardLinks()` 建立連動中心，交給 `DashboardPage` 的 `links`，再以小工具把面板的輸出接到其他面板的輸入。說明見 [vue-build/docs/components/panel/DashboardPage.md](vue-build/docs/components/panel/DashboardPage.md) 的「連動」，範本見 `vue-build/template/pages/dashboard.vue`
  - 每個面板自動輸出選取的列（`selected`）與列出的列（`shown`），由 `ListPage`、`ChartPage` 與 `DetailPage` 寫入，專案的頁面無須修改。詳細頁輸出顯示的那一列
  - 面板以 `scope` 接收輸入：列表只保留其中的列，詳細頁在剛好一列時顯示這一列。開啟 `selects` 的面板點擊即選取，沒有時照常換頁
  - 小工具：`selectionOf`、`shownOf`、`parentOf`、`childrenOf`、`and`、`or`、`pickLatest`、`pickFirst`、`not`。每個小工具回傳一張表中的一組列，「沒有條件」表示不限制，與「沒有列」不同。可以接多層，也可以使用虛擬的 ref 欄位，同一張表也可以並排兩個列表
  - 選取的列不再列出時自動取消，例如被刪除、被搜尋或篩選隱藏，或父列的選取改變
  - 展開的詳細面板的上一列、下一列，依來源列表目前列出的列移動選取。顯示推導出的值時停用
  - 面板的 `mark` 以較淡的細邊標示其中的列，例如以 `shownOf` 取得詳細面板顯示的列。列表元件新增 `marked` prop
  - 以 `shownOf` 接線形成循環時，開發模式下於 console 警告
- **面板的 `shared` 決定是否加入儀表板共用的搜尋、篩選與排序**：預設不加入，面板有自己的一份，與一般頁面相同。加入時，所有加入共用的面板以一個搜尋字串一起過濾，點擊圖表寫入條件。面板中的 `TabPage` 依同一個開關。App Bar 操作關注面板的一份
- **篩選與排序按鈕只在有可用的欄位時出現**：篩選按鈕只列入 `searchable` 中有可篩選欄位的表，排序按鈕只列入 `sortable` 中有可排序欄位的表。沒有任何一張表時，按鈕不出現。抽屜上方的 chip 也只列出這些表
- **展開的面板與一般頁面相同，點擊即進入詳細頁**：開啟 `selects` 的列表點擊一列，以及加入共用的圖表點擊一組，皆照常進入詳細頁。選取不變，選取的那一列仍有細邊。圖例與篩選抽屜照常寫入條件
- **列表貼齊外緣**：deck 的列與分組的標題不再四周留白，列的左右也不再畫邊線，一般頁面與儀表板的面板中皆同。卡片（profile、card、gallery）與表格仍四周留白，分組的標題貼齊。畫面寬時列表仍置中。說明見 [vue-build/docs/components/list/ListLayout.md](vue-build/docs/components/list/ListLayout.md) 的「留白」
- **deck 的左欄加寬，文字最多兩行**：左右兩欄不再各佔一半，改為左欄較寬。標題與各欄位過長時以刪節號截斷，長字串也不再撐開欄寬。右側換成兩行時，標題靠上。說明見 [vue-build/docs/design/list.md](vue-build/docs/design/list.md) 的「deck」
- **長文**：`text` 欄位新增 `multiline`。表單與快速編輯改為多行的輸入框，按 Enter 換行，高度隨內容增加。詳細頁保留值中的換行，列表與標頭中換行顯示為空格。說明見 [vue-build/docs/topics/schema.md](vue-build/docs/topics/schema.md)
- **假後端的 CSV 可以包含換行**：引號內的換行屬於值
- **一律預留整頁捲軸的寬度**：電腦上捲軸出現或消失時，內容的寬度不變。儀表板的整頁高度接近視窗時，捲軸不再反覆出現與消失。換頁時內容也不再左右移動
- **手機上的儀表板左右不留白**：貼齊螢幕的面板，該側沒有邊線與圓角。關注的外框在該側畫在面板的內側
- **關注的外框改由主色的邊線與外側 1px 組成**：面板中的內容（例如窄面板中的頁籤列）不再蓋住外框
- **電腦版的側邊欄也浮在內容上**：開啟後不再與內容並排，與手機版相同。點擊側邊欄以外的地方，或換頁後收起
- **側邊欄中組內的頁面縮排一層**：圖示比組標題的圖示右移一層，不再大幅縮排
- **修正：只有可篩選欄位上的條件使篩選按鈕與放大鏡標示為生效中**：圖表的分組欄不在 `searchable` 中時，點擊圖表寫入的條件不過濾列，按鈕卻標示為生效中

### 不相容的變更

- `useAppBarTabs` 移除。`useCurrentTab` 改由 `@/composables/shell/useCurrentTab` 匯入，只在 `TabPage` 之中有值，之外為 `null`。頁面本身須知道目前的頁籤時，讀取自己的 `v-model`
- `provideSharedListControls` 不再自行登記於 App Bar，改為回傳交給 App Bar 的值，由呼叫者登記
- `DashboardPage` 的 `interactive` 與 `DashboardPanel` 的 `via` 移除，改為手動接線。原本開啟 `interactive` 的頁面，改為參考範本接線
  - 父表的篩選條件不再自動往下連動至子表，子表的篩選抽屜也不再提示上層的條件
  - 選取被搜尋或篩選隱藏時，改為自動取消
- `useDashboardSelection` 移除。面板中的內容改以 `useDashboardPanel()` 讀取面板的輸入
- 儀表板的面板預設不再共用搜尋、篩選與排序。須共用的面板加上 `shared`。點擊圖表寫入條件也只在 `shared` 的面板中發生，其他面板中進入詳細頁
- `provideSharedListControls` 的第二個參數 `cascade`、`SharedListControls` 的 `upperFilter` 與 `ListTable` 的 `inheritedFrom` 移除
- `DashboardPanel` 的 `name` 只能使用英文字母、數字、`_` 與 `-`，其他字元在開發模式下於 console 警告。原本以中文命名的面板，改以英數字命名，畫面上的名稱放在 `title`
- CSS 變數 `--list-card-shadow-extent` 移除。列表的留白改由 `ListLayout` 決定，`ListPage` 的內容區不再留白。`#rows` 放入的內容仍四周留白

## v1.7

- **圖表**：頁面以 `defineChart` 宣告一張表的列如何畫成一張圖表，交給整頁版型 `ChartPage`。圖表可單獨成頁，也可置於儀表板的面板或頁籤頁的頁籤。以 Chart.js 繪製，支援 bar、line、pie、doughnut、polarArea、radar、scatter 與 bubble。Chart.js 於圖表掛載時才載入，沒有圖表的頁面不下載。範本見 `vue-build/template/pages/chart.vue`，說明見 [vue-build/docs/topics/chart.md](vue-build/docs/topics/chart.md)，外觀與用途見 [vue-build/docs/design/chart.md](vue-build/docs/design/chart.md)
  - 分組類的圖表依一欄分組，可再依另一欄分成系列。每組算出數量、總和、平均、最大或最小，可以百分比顯示
  - `stat` 也可為函數，以一組的列為參數、回傳數值，例如中位數。第二個參數提供各組的列與此組的位置，可計算與前一組相比的增長或累計。此時 `label` 必填，`unit` 指定值的格式。說明見 [vue-build/docs/topics/chart.md](vue-build/docs/topics/chart.md) 的「數值」
  - 日期依年、月或日分組，數字與時長等分成幾段。組數較多時，較小的組合併為「其他」
  - scatter 與 bubble 每一列為一個點
  - 點擊一組時進入該組第一列的詳細頁，上一列、下一列只在該組的列之間切換。`ChartPage` 的 `clickable` 設為 `false` 時，點擊圖表與圖例皆沒有反應
  - 顏色使用 Chart.js 預設的七色色盤，填色為半透明。圖例依圖表的比例置於右側或上方。圖例與橫向長條圖的分組名稱放不下時換行
  - `colors` 依名稱指定組或 dataset 的顏色，色名與條件式格式相同。「(空白)」與「其他」以 `chartBlank`、`chartOthers` 指定。未指定的依序輪流，不與已指定的顏色重複
  - 軸上的值皆為整數時，例如數量，刻度只取整數
  - 直的數值軸，刻度的間距至少 28px，矮的圖表格線不再密集。說明見 [vue-build/docs/design/chart.md](vue-build/docs/design/chart.md) 的「尺寸與樣式」
  - 置於儀表板的面板時，圖表填滿面板的內容區，不設最小高度
- **文字統計**：`defineChart` 新增 `type: 'stat'`，以文字顯示每一組的每一個數值，不使用 Chart.js。`group` 可省略，此時全部的列為一組。數值可指定 `sign`（正數加「+」）、`suffix`（單位）與 `textColor`（數字的顏色，可依數值決定）。格的大小固定，儀表板中並排的文字統計彼此對齊。放在儀表板的面板中時，格子以面板的外框為框，左側的色塊貼齊面板的邊。說明見 [vue-build/docs/topics/chart.md](vue-build/docs/topics/chart.md)，外觀見 [vue-build/docs/design/chart.md](vue-build/docs/design/chart.md) 的「文字統計」
- **圖表的高光**：圖表忽略自己分組欄與系列欄上的篩選條件，仍畫出全部的組與系列。符合條件的加上高光，其他的調淡。`useListPage` 新增 `ignoreFilter`，指定不套用至 `rows` 的欄位。說明見 [vue-build/docs/topics/chart.md](vue-build/docs/topics/chart.md) 的「分組欄與系列欄上的條件」
- **以圖表篩選**：點擊圖例時，勾選或取消該組或該系列，與篩選抽屜的勾選相同，可複選。開啟互動的儀表板中，點擊圖表的一組即篩選出這一組，再點擊同一組即取消。日期與數字的區間以新的條件 `segment` 寫入，篩選抽屜以「圖表選取：」顯示。說明見 [vue-build/docs/topics/chart.md](vue-build/docs/topics/chart.md) 的「點擊」
- **側邊欄的頁面清單**：`config/navigation.ts` 新增 `drawerSections`，列出放在側邊欄的頁面。頁面可以分組，有標題的組可以展開與收合，目前的頁面所在的組自動展開。側邊欄的頁面與底部導覽列相同，為頂層頁面。電腦版開啟後與內容並排，換頁時不收起。側邊欄改為獨立的元件 `NavDrawer`，上方顯示 App 名稱，「登出」移至最下方。說明見 [vue-build/docs/components/shell/NavDrawer.md](vue-build/docs/components/shell/NavDrawer.md)
- **底部導覽列最多 5 項**：超過時只顯示前 5 項，開發模式下以 console 警告。按鈕平分整列的寬度，不再有最小寬。修正項目過多或畫面較窄時，頭尾的按鈕超出畫面
- App 中的文字依用詞表統一：詳細頁箭頭的 `aria-label` 改為「上一列」「下一列」，「找不到這筆資料」改為「找不到這一列」，衝突時的選項「放棄並重抓」改為「放棄並重新抓取」
- 儀表板面板的內容區改為 size container，面板中的內容可依面板的高度排版，例如以 `cqh` 指定高度
- **共用色名**：條件式格式的七種顏色登記為 Vuetify 主題色 `vuesheet-red`、`vuesheet-orange`、`vuesheet-yellow`、`vuesheet-green`、`vuesheet-blue`、`vuesheet-purple`、`vuesheet-grey`，隨深淺色主題切換。其他地方也可使用：元件的 `color="vuesheet-red"`，或 `text-vuesheet-red`、`bg-vuesheet-red` 等 class。色值改為引用 `vuetify/util/colors` 的色板，結果不變。說明見 [vue-build/docs/components/view/FormattedValue.md](vue-build/docs/components/view/FormattedValue.md)
- 文件依新的寫作規則改寫：不用分號、限制句長、一句一事，並統一用詞，例如「列」不寫成「筆」
- 外觀的尺寸、間距與顏色集中於 `vue-build/docs/design/` 各文件的「尺寸與樣式」。元件與機制的文件只寫位置與行為，並連至該處
- **放大鏡標示過濾中**：有搜尋字串或篩選條件時，App Bar 的放大鏡為主色，搜尋列收起時也看得出列表正被過濾
- **儀表板的篩選往下連動**：開啟互動時，子表的列，其父列也須符合父表的篩選條件，多層皆適用。子表的篩選抽屜顯示「另受『父表』的條件影響」，點選即切換至該表。說明見 [vue-build/docs/components/panel/DashboardPage.md](vue-build/docs/components/panel/DashboardPage.md) 的「互動」
- **列表順序改為點擊時發布**：點擊一列時，列表才發布畫面上的順序，詳細頁的上一列、下一列依此切換。一般換頁的行為不變。互動儀表板中，選取一列後再修改篩選，詳細面板的上一列、下一列仍依選取時的順序。說明見 [vue-build/docs/components/record/RecordNav.md](vue-build/docs/components/record/RecordNav.md)
- **deck 的單側延伸**：view 省略右側的兩個位置（副標與補充）時，左側延伸至整行。省略左側的兩個位置（標題與摘要）時，右側延伸至整行並靠右。說明見 [vue-build/docs/components/list/DataList.md](vue-build/docs/components/list/DataList.md)
- 修正：沒有可搜尋欄位（`searchable` 中沒有 `text` 或 `ref`）的表，輸入搜尋字串後一列都不剩。這類表現在不受搜尋影響
- 修正：從一個頁籤頁換到頁籤名稱不同的另一個頁籤頁時，新頁面的內容滑出，畫面空白
- 修正：詳細頁的就地編輯欄位以非 passive 的觸控事件攔截滑動，Chrome 於 console 顯示效能警告

### 不相容的變更

- `useListOrder(table, ids)` 移除，改為 `provideListOrder(table, ids)`。只有不使用 `ListPage`、自行發布順序的頁面須修改
- `config/navigation.ts` 須另外 export `drawerSections`（側邊欄沒有頁面時為空陣列）。底部導覽列超過 5 項時，第 6 項起須移至 `drawerSections`
- 條件式格式的色名型別 `FormatColor` 改名為 `ColorName`，圖表也使用這個型別。只有 import 這個型別的程式須修改
- 儀表板的格子細分為原本的一半：手機寬 12 格，電腦寬 48 格。`layout` 中的寬與高須乘以 2，座標 n 須改為 2n − 1。面板的實際大小不變。說明見 [vue-build/docs/design/dashboard.md](vue-build/docs/design/dashboard.md) 的「尺寸」與「排版」

### 版本後修正

- 修正：圖表依選項類的欄位分組時，只列出資料中出現過的選項。現在依 `options` 的順序列出每個選項，沒有列的選項數量與總和為 0。boolean 一律列出「否」與「是」。系列也依同樣的規則。說明見 [vue-build/docs/topics/chart.md](vue-build/docs/topics/chart.md) 的「計算的規則」

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
