# UI 設計重點

畫面長什麼樣、動作擺在哪裡、搜尋與篩選怎麼運作。外觀仿 AppSheet，以手機優先。

> **前置**：動作見 [actions.md](actions.md)，KeepAlive 的機制見 [architecture.md](architecture.md)；每個元件的用法見 [components/](components/)。

> **標記**：沒有標記＝已經實作。🔶 部分實作、🔲 尚未實作。詳細進度見 [ROADMAP.md](../../ROADMAP.md)。

---

## 畫面各部位的名字

```
┌─────────────────────────────────┐
│ ←   標題         🔍 ⇅  ⋮   ⟳    │  App Bar
│ ─────── 頁籤列 ───────           │  extension（有 TabPage 時才出現）
├─────────────────────────────────┤
│                                 │
│   內容區                        │  ← 側邊欄  篩選／排序抽屜 →
│   （pages/*.vue）               │
│                                 │
│                         ╭─────╮ │
│                         │  ＋ │ │  FAB
│                         ╰─────╯ │
│        ▁▁▁ snackbar ▁▁▁         │
├─────────────────────────────────┤
│  ⌂ 首頁      ▤ 表A     ▤ 表B    │  底部導覽列
└─────────────────────────────────┘
```

| 部位 | 元件／來源 | 說明 |
| --- | --- | --- |
| **App Bar** | `AppShell` | 頂部固定那條。標題來自 `route.meta.title`，沒有就用 `config/app.ts` 的 App 名稱 |
| **左側圖示** | `AppShell` | 有 App 內上一頁就是返回箭頭，否則是漢堡選單 |
| **App Bar 動作** | `useAppBarActions()` | 右側的圖示鈕，≥3 顆收成「⋮」 |
| **搜尋鈕／搜尋列** | `useListControls()` | 按放大鏡後整條 App Bar 換成輸入框。它是獨立的一顆，不會被收進「⋮」；多選時整顆讓位 |
| **篩選鈕** | 同上 | 在搜尋輸入框內最右側 |
| **排序鈕** | 同上 | 放大鏡右邊。表有給 `sort` 才出現；多選時跟搜尋一起讓位 |
| **同步鈕** | `AppShell` | 永遠在最右邊，不屬於任何頁面 |
| **頁籤列** | `TabPage` | 掛在 App Bar 底下的 extension，不跟著內容捲動 |
| **內容區** | `pages/*.vue` | 換頁時左右滑動的就是這一塊 |
| **側邊欄** | `AppShell` | 左側滑出，蓋在 App Bar 之上。預設關閉，按漢堡選單開啟。目前只有「登出」（`config/app.ts` 的 `authMethod` 不是 `'none'` 時才有） |
| **篩選／排序抽屜** | `AppShell` + `FilterPanel`／`SortPanel` | 右側滑出（篩選是兩層）。蓋在 App Bar 之上。抽屜本身歸 `AppShell`，面板只放內容，一次顯示一種 |
| **FAB** | `PageFab` | 右下角浮動按鈕，主要動作 |
| **底部導覽列** | `config/navigation.ts` | 切換主要頁面 |
| **底部動作列** | `useBottomActions()` | 表單頁時**暫時取代**底部導覽列 |
| **snackbar** | `notify()` | 底部一閃即逝的訊息，全 App 一則。`notify('已推送')`、`notify('推送失敗', 'error')`（第二個參數是 Vuetify 的 color） |
| **上下一筆箭頭** | `RecordNav` | 詳細頁左右兩側，浮在內容上 |

對話框（`ConfirmDialog`、`FieldsDialog`）與這些位置無關，一律蓋在畫面中央。

---

## 外殼與導覽

- **頂部 App Bar + 側邊欄外殼**。左側圖示依當下路由自動切換漢堡選單／返回箭頭——用 router 累計的導覽次數判斷有沒有真正的 App 內上一頁，沒有就不顯示返回箭頭
- **主要導覽用底部導覽列**，項目來自 `config/navigation.ts`；側邊欄目前只放登出
- **頁面可以不要外殼**：`definePage` 的 `meta.shell` 設成 `false`，App Bar、側邊欄、底部導覽列都不顯示，整頁由頁面自己排版（登入頁 `pages/login.vue` 就是這樣）
- 🔲 **桌面版導覽待定**：要不要改成側邊欄常駐、底部導覽列要不要在桌面隱藏，等要做桌面體驗時再決定

---

## 列表

### 版面的種類

每一列的呈現方式由放進 `ListPage` slot 的元件決定；哪個欄位放在哪個位置則由頁面定義的 view 指定（`defineView`，card 為 `defineCardView`，見 [DataList](components/list/DataList.md#view)）。同一個 view 可交給 deck、profile 或 gallery，換版面不需改寫欄位的對應。

| 版面 | 元件 | 外觀 | 該列的動作 | 適合 |
| --- | --- | --- | --- | --- |
| deck | [DataList](components/list/DataList.md) | 連成一串的列，左側縮圖，四個角各一個欄位 | 右下角欄位的下一列，一排按鈕 | 一般的瀏覽，一列可看到較多欄位 |
| profile | [DataProfile](components/list/DataProfile.md) | 分開的卡片，左側圓形頭像，中間標題與副標 | 右側的 ⋮ 選單 | 以人或物為主體、資訊精簡的表 |
| card | [DataCard](components/list/DataCard.md) | 分開的卡片，上下四層：頭像與標題、大圖、標題與摘要、動作 | 第 4 層，左右各兩格 | 圖片與說明並重的表 |
| gallery | [DataGallery](components/list/DataGallery.md) | 格狀排列的方格，正方形圖片加上標題與副標，手機上為兩欄 | 右下角的 ⋮ 選單 | 以圖片為主的表 |
| table | [DataTable](components/list/DataTable.md) | 表格 | 無 | 比對多個欄位 |

- **gallery 須搭配 `ListPage` 的 `layout="grid"`**，其餘維持預設的 `list`（見 [ListLayout](components/list/ListLayout.md)）。分組時每一組各自排列，組的標題一律佔一整行
- **table 走 `ListPage` 的 `#rows` slot**，整批交給 `DataTable`。表格沒有多選——要批次操作就用其他版面
- **deck、profile、card、gallery 皆支援長按多選**，接法相同：`v-bind` 上 `ListPage` slot 給的 `props`。多選模式下各版面的動作皆隱藏
- **排序與分組與版面無關**：順序來自 `useListPage`（`defaultSort` 或使用者選的排序）與 `groupRows`，各版面皆依同一順序呈現；gallery 為由左往右、再由上往下
- **間距、陰影與點擊、選取的樣式為各版面共用**，定義於 `src/styles/list.css`（見 [ListLayout](components/list/ListLayout.md) 的「共用的樣式」）
- 範本見 `template/pages/` 的 `list.vue`（deck）、`profile-list.vue`、`card-list.vue`、`gallery-list.vue`

詳細頁另有選用的標頭區塊（[DetailHeader](components/record/DetailHeader.md)），結構為 card 去掉第 1 層，由 `DetailPage` 的 `header` 開啟。

### 列表的行為
- **用 `<KeepAlive>` 保留展開狀態**（`GroupedList` 的收合、多選、搜尋字串…），注意事項見 [architecture.md](architecture.md#keepalive-的規則)。捲動位置不是元件狀態，由 router 另外記（回到看過的頁面會回到原本的位置，新頁面從頂端開始）
- **長按進入多選模式**：選取狀態一有內容就自動進入、清空就自動離開，不另外存一個 boolean
- **多選的出口是 App Bar 右上的「取消」**：`useMultiSelect()` 自己登記「怎麼退出」，按鈕的樣子跟位置由 `AppShell` 決定（跟放大鏡一樣）。它固定在同步鈕左邊，而且**不會被收進「⋮」**——收進去就等於沒有出口
- **多選時搜尋鈕先讓位**：那個狀態下畫面上該有的是對選取項目的動作，不是找東西。`AppShell` 靠「有沒有登記取消」判斷現在是不是多選
- **離開就取消選取**：換頁（列表是 KeepAlive 的，靠 `onDeactivated`）與換頁籤都會清空，頁面不用做任何事。頁籤的訊號來自 `TabPage` 登記給 `AppShell` 的那份（`useCurrentTab()`），所以同一張表的頁籤、各自一張表的面板走的是同一條路
- **頁籤列固定在 App Bar 底下**（`TabPage` 登記給 `AppShell` 的 extension），不跟著內容捲動

---

## 動作擺在哪裡

| 位置 | 用途 |
| --- | --- |
| 右下角 FAB | 主要動作，例如新增、編輯 |
| App Bar 右側 | 次要動作，例如刪除、批次刪除 |
| 螢幕最底端 | 表單頁的取消／送出，暫時取代底部導覽列 |
| 詳細頁的單一欄位 | 該欄的動作，例如前往 ref 的對方、開網址 |
| 子表區塊的右下角 | 排在「展開」旁邊，通常是新增子列 |
| 列表的每一列 | 該列的動作，例如編輯、刪除；deck 置於右下角欄位的下一列，profile 收於右側的 ⋮ 選單 |

怎麼把動作放上去、動作的描述方式、內建 builder、連續動作與快速編輯對話框，見 [actions.md](actions.md)。

---

## 搜尋

頁面登記後 App Bar 才出現放大鏡，按下去整條 App Bar 換成「←＋輸入框」（淺灰藥丸形），標題與動作先讓位。

**列表頁不需自行串接**：`useListPage(table, schema)` 內部已登記，回傳的 `rows` 即為篩選與搜尋後的結果。其內部以 `useListControls` 登記一條搜尋字串（頁面的 ref），再以 `useSearch` 依該字串過濾；自行組版面時依同樣的方式串接。

- **有登記才有放大鏡**，所以實務上只有列表頁有。詳細頁與表單頁刻意不放：App Bar 的搜尋代表「這一頁的主體是一份清單」，詳細頁裡的子表要找東西，請去那張表的列表頁
- **`query` 是頁面的 ref**，`AppShell` 只負責讓使用者打字進去；過濾是頁面自己做的
- **比對 `schema.searchable` 裡的 `text`／`ref` 欄位**（真實與虛擬都行，ref 比的是父列的名字）；同一份清單裡的其他型別歸篩選抽屜
- **分詞**：依空白切詞、雙引號包起來的當一個詞，每個詞都要命中（AND）
- **全部小寫比對**，不做全半形正規化
- **效能**：每列的可搜尋文字只在 rows 變時重算，敲字只做 `includes`
- **換頁自動收起**；回到還帶著 query 的頁面（KeepAlive）會自動重開，讓搜尋欄跟被過濾的列表一致
- **有頁籤的頁**：各頁籤的列表放在 `TabPage` 中時，搜尋字串由 `TabPage` 統一登記、跨所有頁籤共用（見下方「同一頁面中的多張表」）

---

## 篩選

登記時多給 `{ tables: [{ schema, filters, rows }] }`，輸入框內最右側即多一顆篩選鈕（有條件生效時為主色），按下後自右側滑出抽屜。`useListPage` 已連同篩選一併登記：每張表一份 `filters`，與未過濾的整表一起交給 `useListControls`，資料再依序經過 `useFilter` 與 `useSearch`。

順序是固定的：**整表 → `useFilter` → `useSearch` → 畫面**。篩選抽屜的選項要看整表（`allRows`）才列得出「資料裡出現過哪些值」，所以它吃的是還沒過濾的那份；搜尋放最外層最便宜（敲字只重跑 `includes`）。

- **改了即時生效**，沒有套用鈕；← 關閉搜尋時篩選一起清掉
- **篩選的對象是 `schema.searchable` 裡的 `select`／`number`／`date`／`duration`**（`text`／`ref` 歸搜尋，兩邊共用同一份清單）
- **欄位之間 AND、同一欄的多選之間 OR**
- **範圍條件**（number／date／duration）只填一邊就是單邊限制；值是空的列會被排除。時長換算成秒來比
- **select 多一個「(空白)」**，勾了才留空值的列
- **選項只列 `rows`（未過濾整表）裡出現過的值**，資料變了選項跟著變

### 抽屜是兩層的

| | 內容 |
| --- | --- |
| **第一層** | 可篩選欄位的清單（順序就是 `schema.searchable` 的順序，跳過歸搜尋列的 `text`／`ref`）。有條件的欄位名稱底下用小字顯示現在篩什麼（`≥ 100`、`100 ～ 500`、`2026/01/01 ～`；select 是選到的值串起來，太長就截斷加「…共 X 項」），右側點一個主色圓點。「清除」在這一層，清掉整張表的條件 |
| **第二層** | 點一欄進去填值：select 是一列一項的 checkbox（「(空白)」排最後）、number／date／duration 是兩格範圍。← 回第一層 |

關掉抽屜也會回到第一層。抽屜開著時 `PageFab` 會讓開——它的 z-index 本來就在 layout 之上，靠 `useOverlay` 的 `overlayOpenKey` 通知。

抽屜連同背後的遮罩蓋住整個畫面，**開著時 App Bar 上的東西都碰不到**（包括搜尋列與 ← 關閉），要先關掉抽屜才能操作別的。右側抽屜是篩選與排序共用的，一次只顯示一種——因為要換另一種就得先關掉它，互斥不用另外寫邏輯擋。

### 同一頁面中的多張表

**將各列表放入 `TabPage` 的頁籤即可，不需另行登記**（見 [TabPage.md](components/panel/TabPage.md)）；同時顯示多個列表時放入 `DashboardPage` 的面板，行為相同（見 [DashboardPage.md](components/panel/DashboardPage.md)）。`TabPage` provide 一份「共用的列表控制」（`useSharedListControls`），其中的 `useListPage` 不自行登記，改為加入此控制：

- **搜尋字串共用一條**：輸入一次，各頁籤的列表皆隨之過濾
- **同一張表共用一份篩選與排序**：例如各頁籤為同一張表依狀態切分的列表（以 `useListPage` 的 `scope` 只留該狀態的列），條件套用於所有頁籤，抽屜中該表只有一個 chip
- **不同的表各有一份**，同時生效；抽屜第一層的上方多出一排表的 chip
- **其中沒有列表時不登記**，App Bar 不出現放大鏡
- 頁籤的值與某張表的 `tableLabel` 相符時，抽屜開啟時先停在該表

抽屜的行為：

- **第一層的上方有一排表的 chip**（標籤為 `schema.tableLabel`），決定目前編輯哪一張表；只有一張表時不顯示。關閉抽屜即重置，下次開啟時重新依頁籤決定
- **篩選鈕的主色標記涵蓋所有表**；「清除」僅清除目前的那一張，全部清除須按 ←（關閉搜尋）
- **排序面板使用同一批表**（僅列出可排序者），chip 亦為同一排

**同一張表依狀態切分的頁籤頁**：將列表拆成只供引用的元件，置於該表資料夾的 `_ref/`（不產生路由），以 `scope` 只留該狀態的列；頁籤頁僅保留 `TabPage`，每個頁籤放一個列表並傳入狀態。`scope` 位於篩選與搜尋之前，各頁籤僅比對各自的部分，合計的工作量與「整張表搜尋一次再切分」相同。範本見 `template/pages/tab-list.vue` 與 `template/pages/_ref/list.vue`。

**拆出的列表以 props 接受條件**，同一個元件可用於不同頁面，例如另一頁只列某一種狀態。常用且意義固定的條件宜定為專屬的 prop（如 `status`）；需要任意條件時，另提供通用的 `scope` prop，於元件內與專屬的條件合併。

**不使用 `TabPage` 時，由頁面手動登記**：各表的 `useListPage` 關閉自動登記，並共用頁面建立的一條搜尋字串，由頁面以 `useListControls` 一次登記全部的表。寫法見 [ListPage.md](components/page/ListPage.md#手動登記多張表)。

---

## 排序

列進 `schema.sortable` 的欄位就會出現在排序面板裡（**面板上的順序就是那份清單的順序**），`useListPage` 已經把 `sort` 一起登記好，所以列表頁什麼都不用寫，App Bar 的放大鏡右邊就多一顆排序鈕（不是預設排序時主色）。按下去開的是**跟篩選同一個右側抽屜**。

- **一次只排一欄**：點一欄選它、再點同一欄換升降，右側箭頭顯示現在的方向。多層排序刻意不做（手機上沒人用，而且 schema 的 `defaultSort` 已經在講「這張表本來的順序」）
- **`schema.defaultSort` 永遠接在後面當 tiebreaker**，所以同分的列順序是穩定的
- **「清除」回到 `defaultSort`**，位置與外觀跟篩選那顆一樣；沒選排序時清單上就沒有任何一列被標記
- **改了即時生效**，沒有套用鈕
- **重整回預設**，不做持久化（跟篩選同一個標準）
- **`image` 不能排**，列進 `sortable` 也會被跳過

比較方式大致是「照值排」，兩個型別例外：

| 型別 | 照什麼排 |
| --- | --- |
| `ref` | 對方的 `$label`（值本身是 id，照 id 排沒意義） |
| `select` | `options` 的宣告順序（狀態有先後，照字典序排不對）。`options` 沒有的值（`allowCustom` 打的）一律排最後 |
| 其他 | 欄位值；`duration` 換算成秒、`date` 比時間、空值一律最後（不管升降） |

**排序與分組是二選一的**：分組（`groupRows`）會把原本的順序壓成組內順序，所以使用者選了排序卻只看到每個月裡面重排，會很困惑。頁面自行判斷，框架不介入：`useListPage` 回傳的 `sort` 有值時，交給 `ListPage` 的是 `rows` 而非 `groups`（寫法見 [ListPage.md](components/page/ListPage.md#分組與頁籤)）。

排序一改，`ListPage` 發布給 `useListOrder` 的順序跟著改，所以詳細頁的上下一筆與左右滑動自動跟畫面一致。

---

## 設計取捨

**為什麼表單的按鈕在螢幕最底端**
「取消／送出」永遠在拇指構得到的地方，不用把長表單捲到最後才按得到。而表單本來就是「要按到才算完成」的頁面，此時不該讓人分心去切分頁，所以它直接取代導覽列。

**為什麼 App Bar 動作走 provide/inject、FAB 走 Teleport**
App Bar 屬於 `AppShell`，頁面只需把動作交給它，不需要真的搬 DOM；FAB 是 `position: fixed`，放在頁面裡時，祖先帶有 `transform` 或 containment（例如 dashboard 面板）便會成為它的定位基準，因此送到 `body`。換頁動畫中兩者皆另有 `view-transition-name`，不隨頁面滑動（見 [architecture.md](architecture.md#設計取捨)）。

**為什麼每一塊都是單一 setter**
三塊都走同一個 `registerActions`（`useActionSlot.ts`），同一時間只認一個頁面的動作。所以一定要靠 `isActive` 擋住被 KeepAlive 快取的頁面——它們仍然是全速運轉的（見 [architecture.md](architecture.md#keepalive-的規則)），動作一變就會蓋掉當前頁面的。