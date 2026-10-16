# Dashboard（設計稿）

> 🔶 部分實作。本文件為設計，實作完成後改寫為用法說明，或移入 ROADMAP。已完成：多個列表共用搜尋、`useListPage` 的 `scope`、`_ref/` 的路由排除，第 1 階段（`DashboardPage`、`DashboardPanel` 的方格排版、小外殼與關注點、共用的搜尋、平時隱藏 FAB 與 App Bar 的動作）第 2 階段（展開）與第 3 階段（互動），見「與現有機制的關係」中標為 ✅ 者。尚未實作：多選的鎖定、面板過窄時的窄版。

dashboard 同時顯示多個面板，與一次只顯示一個面板的 tab（`TabPage`）相對。以 `interactive` 開關決定面板之間是否連動：

- **關**：各面板各自獨立，點擊一列即照常換頁
- **開**：點擊一列改為「選取」，與它直接相關的面板跟著改變內容，不換頁。手機上亦同：即使相關的面板不在畫面內，點擊仍只選取

---

## 元件分工

| 元件 | 職責 |
| --- | --- |
| `DashboardPage` | 整頁：排版、關注點、多選的鎖定、展開、搜尋與篩選的登記、互動的選取狀態 |
| `DashboardPanel` | 單一面板：外框、小外殼（標題列）、可否成為關注點；向內 provide 「是否為當前面板」、「是否已展開」與互動經由的 ref 欄位（`via`） |
| 面板的內容 | 既有的頁面（見「嵌入既有頁面」），或以 `ListPage`、`DetailPage` 等元件直接組成；由 `DashboardPanel` 控制各項登記何時生效（見「與現有機制的關係」） |

```vue
<script lang="ts" setup>
  // 各面板的排版集中於一處，以面板的 name 對應；未列出者或留空的斷點即為預設大小
  const layout = {
    parents: { desktop: { w: 8, h: 14 } },
    parent: { mobile: { h: 6 }, desktop: { w: 16, h: 7 } },
    children: { desktop: { x: 9, y: 8, w: 16, h: 7 } },
  }
</script>

<template>
  <DashboardPage :interactive="true" :layout="layout">
    <DashboardPanel name="parents" title="父表">
      <ListPage … />
    </DashboardPanel>

    <DashboardPanel name="parent" title="父表詳細">
      <DetailPage … />
    </DashboardPanel>

    <DashboardPanel name="children" title="子表">
      <ListPage … />
    </DashboardPanel>
  </DashboardPage>
</template>
```

`layout` 的寫法見「排版」。

---

## 嵌入既有頁面

面板可直接放入既有的列表頁與詳細頁，頁面本身不需修改：

```vue
<script lang="ts" setup>
  import ChildList from '@/pages/child/index.vue'
  import ParentDetail from '@/pages/parent/[id]/index.vue'
  import ParentList from '@/pages/parent/index.vue'
</script>

<template>
  <DashboardPage :interactive="true" :layout="layout">
    <DashboardPanel name="parents" title="父表"><ParentList /></DashboardPanel>
    <DashboardPanel name="parent" table="parent" title="父表詳細"><ParentDetail /></DashboardPanel>
    <DashboardPanel name="children" title="子表"><ChildList /></DashboardPanel>
  </DashboardPage>
</template>
```

頁面以元件的形式 import 時，其 `<route>` 區塊不生效。各項差異由框架處理：

| 頁面所做的事 | 於面板中 |
| --- | --- |
| 詳細頁以 `useRecordPage` 自網址取得 id | `useRecordPage` 偵測到位於 dashboard 中時，改取互動的選取（見「哪些面板會連動」），不讀網址 |
| 列表頁的 `useListPage` 自行登記搜尋、篩選與排序 | 偵測到位於 dashboard 中時不自行登記，改用 dashboard 共用的 `query`，並將自己的表交由 dashboard 統一登記 |
| 列表頁取得的 `rows` | 依序經過互動（依所選的父列篩出子列）、篩選、搜尋 |
| 列表的每一列以 `to` 換頁 | 開啟互動時改為選取；選取的那一列另有標示，與多選的淡底區分 |
| `useAppBarActions`、FAB、`DetailPage` 的上下一筆與左右滑動 | 見「小外殼與關注點」與「展開」 |
| 刪除當前那一筆後自動離開 | 僅於網址為 `/表/id` 時觸發，dashboard 中不觸發 |
| 頁面中的換頁（例如前往編輯頁） | 照常換頁，離開 dashboard；此類動作僅於展開時出現 |

- **不支援含有 `TabPage` 的頁面**：`TabPage` 與 `DashboardPage` 不可互相嵌套，亦不可嵌套自身（開發模式下於 console 警告）。`TabPage` 將頁籤列登記於 App Bar，dashboard 的多個面板無法共用；兩者皆 provide 共用的列表控制，列表只會加入最近的一層，兩層又各自登記搜尋。這類頁面將頁籤以外的部分拆成單純的列表，由頁籤頁與 dashboard 各自使用（見下方「只供嵌入的頁面」與「多個列表共用搜尋」）
- **列表順序的發布**：`ListPage` 發布該表目前的列表順序，供詳細頁的上下一筆使用。自 dashboard 進入詳細頁時，上下一筆依面板中的順序（例如僅於所選父列的子列之間切換）

### 只供嵌入的頁面

只供嵌入、不應被導覽到的頁面（例如自頁籤頁拆出的單純列表）放在各表資料夾底下的 `_ref/`（例如 `pages/parent/_ref/ParentList.vue`）。路由插件以一條 glob（`src/pages/**/_ref/**`）排除任意層的 `_ref/`，其中的檔案不產生路由，亦不出現在 `typed-router.d.ts`；新增表時不需修改設定（見 [architecture.md](architecture.md) 的路由表）。

`_ref` 指「供其他頁面引用」，與 schema 的 `ref` 欄位型別及 Vue 的 `ref()` 無關。

### 多個列表共用搜尋

`TabPage` 與 `DashboardPage` 皆 provide 一份「共用的列表控制」：一條共用的 `query`，以及收集各列表的表的登記處。其中的 `useListPage` 據此決定行為：

| `useListPage` 所在之處 | 行為 |
| --- | --- |
| `TabPage` 或 `DashboardPage` 之內 | 不自行登記；使用共用的 `query`，並將自己的表交由外層。外層統一登記一次 `useListControls`，App Bar 只有一個放大鏡，篩選抽屜中各表各有一個 chip |
| 其他（例如作為獨立的頁面） | 照現行方式自行登記 |

因此列表本身不需知道自己被放在何處，頁籤頁與 dashboard 亦不需自行撰寫 provide：拆出的單純列表放進 `TabPage` 即自動共用搜尋，維持「一條搜尋字串套用於所有頁籤」。

- **同一張表的篩選與排序亦共用一份**：多個列表屬於同一張表時，自外層取得的是同一份篩選條件與排序，抽屜中該表只有一個 chip，條件套用於所有使用該表的列表

### 範例：拆分含頁籤的列表頁

以「依 `status` 分頁籤的父表列表」為例，拆成兩個檔案：

| 事項 | `pages/parent/index.vue`（頁籤頁） | `pages/parent/_ref/ParentList.vue`（列表） |
| --- | --- | --- |
| 頁籤（依狀態切分） | ✅ `TabPage` 列出各狀態，每個頁籤放一個 `ParentList` 並傳入 `status` | |
| 路由的標題（`<route>`） | ✅ | |
| 取得資料 | | ✅ `useListPage` |
| 只留該狀態的列 | | ✅ `useListPage` 的 `scope` |
| 篩選、搜尋 | | ✅ 由 `useListPage` 套用共用的條件 |
| 分組 | | ✅ |
| view | | ✅ |
| FAB（新增時預設帶入該狀態） | | ✅ |
| 多選、批次刪除 | | ✅ |

範本見 `template/pages/tab-list.vue`（頁籤頁）與 `template/pages/_ref/list.vue`（列表）。

- **`scope` 於篩選與搜尋之前縮小範圍**：資料依序經過「整表 → `scope` → 篩選 → 搜尋 → 分組」。各頁籤先只留自己的列再比對，各頁籤的資料合起來恰為整張表，搜尋的總工作量與拆分前相同；若改為各自搜尋整張表再切分，工作量會成為頁籤數的倍數。dashboard 的互動篩選（依所選的父列篩出子列）亦位於這一步
- **搜尋、篩選與排序的登記由 `TabPage` 負責**（見「多個列表共用搜尋」），兩個檔案皆不登記；實際的過濾由各列表的 `useListPage` 進行
- **FAB 屬於列表**：預設的狀態直接取自 `status` prop。各頁籤皆有 FAB，`TabPage` 僅讓當前頁籤者生效；於 dashboard 中僅展開時出現
- **同一個列表於 dashboard 中直接嵌入**，不給 `status` 即為整張表

**顯示速度**（推算，實作後須依 [perf.md](perf.md) 的方法量測）：

| | 拆分前 | 拆分後 |
| --- | --- | --- |
| 首次開啟 | 處理整張表，再切出第一個頁籤 | 僅第一個頁籤的列表掛上，僅處理該狀態的列 |
| 每次輸入搜尋 | 比對整張表一次 | 看過的各頁籤各自比對自己的範圍，合計相同 |
| 依頁籤切分 | 若寫成於 template 中呼叫的函式，每次重新渲染皆重新篩選 | `scope` 位於 computed 中，僅資料變動時重算 |
| 篩選抽屜的選項 | 掃描整張表一次 | 同一張表共用，同樣只掃描一次 |

---

## 排版

由設計者決定，以方格座標描述。內容區的寬度切成固定的格數，格子為正方形，面板的寬與高皆以格數表示，手機與電腦皆可二維排版（例如兩個統計面板於手機上並排）。

### 方格

估算以 1080×1920 的手機與 1920×1080 的電腦螢幕為準。手機的 1080×1920 為實體像素，網頁中約為 360×640 的 CSS 像素（device pixel ratio 為 3）；電腦於縮放 100% 時即為 CSS 像素，`v-container` 的最大寬度為 1400px。

| | 寬的格數 | 每格約（含間距） | 內容區的高度約 | 面板的最小寬度 |
| --- | --- | --- | --- | --- |
| 手機 | 6 | 55px（內容區寬約 330px） | 9.6 格 | 2 格 |
| 電腦 | 24 | 57px（內容區寬約 1368px） | 15 格 | 2 格（約 106px，與手機相近） |

偏離基準的常見情況，結論不變：較長的手機（例如 20:9，網頁中約 360×800）約 12 格高；開啟 125% 縮放的筆電（網頁中約 1536×864）`v-container` 的最大寬度降為 1000px，每格約 41px，約 16 格高。

- **選用 6 與 24**：皆可二等分與三等分，24 另可四、六、八等分；兩者為 1:4，手機的半寬（3 格）於電腦上為 12 格。兩者每格的實際大小相近，「高幾格」於手機與電腦上的實際高度亦相近
- **格子的高等於寬**：一格的邊長由內容區的寬度算出，欄寬與列高皆為此值，兩個方向的間距亦相同，因此寬與高格數相同的面板必為正方形（見「位置的計算」）
- **手機或電腦的排版由單一的布林值決定**：框架提供一個 composable（例如 `useCompactLayout()`），dashboard 中所有與排版相關之處僅讀取此值，不直接使用 `useDisplay`。此值同時寫於 `DashboardPage` 的屬性（例如 `data-layout="mobile"`），CSS 以屬性選擇器切換 6 格或 24 格，JS 與 CSS 依同一個判斷。判斷規則只寫在該 composable 中，日後改為依內容區寬度或依裝置時只需修改一處
- **初始的判斷規則暫定為 Vuetify `useDisplay()` 的 `mobile`**：依視窗寬度判斷，預設以 1145px 為界，視窗大小改變時即時更新。平板直放（例如寬 820px）會被視為手機，6 格時每格約 130px，過大；門檻日後再調整（見「待定事項」）。`platform` 僅於啟動時比對一次 user agent，且 iPadOS 預設送出 Mac 的 user agent，不適合用於判斷平板

### 三種排版

各面板的排版集中寫於 `DashboardPage` 的 `layout`，以面板的 `name` 對應，手機與電腦分別指定。依給了哪些值分為三種：

| 類型 | 寫法 | 寬 | 高 |
| --- | --- | --- | --- |
| 固定 | `{ w, h }` | 指定格數 | 指定格數 |
| 只控制高 | `{ h }` | 填滿 | 指定格數 |
| 自動 | 未列出該面板，或該斷點留空 | 手機：填滿；電腦：8 格 | 手機：依內容，最多 8 格；電腦：7 格 |

```ts
const layout = {
  // 手機上兩個寬 2 的面板並排置中：左右各空一格
  countA: { mobile: { x: 2, w: 2, h: 2 }, desktop: { w: 4, h: 3 } },
  countB: { mobile: { x: 4, w: 2, h: 2 }, desktop: { w: 4, h: 3 } },
  list: {},   // 兩個斷點皆為自動
}
```

- **依 `DashboardPanel` 宣告的順序逐一放入**：沒給座標的面板接在上一個面板的右側；需要時另給左上角座標 `x`、`y`（自 1 起算），用於自動排列做不到的特殊情況，例如上例的並排置中。只給 `y` 時從該列的開頭開始，只給 `x` 時與上一個面板同一列。手機上依內容撐高的面板高度不固定，`y` 座標無意義，手機通常只給大小
- **重疊時移動後宣告的那一個**：先往右移（`x + 1`），超出右緣而放不下時，換到下一列的開頭（`y + 1`、`x` 回到 1），直到放得下為止。有給的座標因此被改動時，於 console 警告
- **手機的自動**：寬填滿，高度依內容撐開，最多 8 格，超過即於面板內捲動。內容很少的面板不會撐到 8 格。16:9 的手機內容區約 9.6 格高，8 格約佔螢幕的 69%；20:9 的手機約 12 格高，8 格約佔 56%。兩者皆低於一個畫面，面板上下總留有空間捲動整頁
- **電腦的自動**：固定寬 8 格、高 7 格，一個畫面可顯示 3×2 個面板（兩排共 14 格，內容區約 15 格高）。高度固定而非依內容撐開，同一排的面板才會對齊，第二排不致錯落。小外殼約佔一格，內容實際可用約 6 格（1920×1080 時約 340px，deck 約可顯示 4–5 列）
- **面板在自己的框內捲動**；捲到底時繼續滑動會帶動整頁（瀏覽器預設的 scroll chaining，不另外阻擋）。固定與只控制高的面板，高度是否合適由設計者負責

### 位置的計算

CSS grid 遇到座標重疊時直接讓面板疊在一起，既不警告亦不挪開，因此各面板的位置由 JS 依上述規則算出（`placePanels`，純函式），CSS 僅照著繪製：

- **格子的大小**：`DashboardPage` 以 `ResizeObserver` 量測內容區的寬度，扣除間距後等分為 6 或 24 格，得出一格的邊長；`grid-template-columns` 與 `grid-auto-rows` 皆以 inline style 指定，列高即為該邊長
- **各面板的位置**：以 inline style 的 `grid-column` 與 `grid-row` 放上算好的起點與跨越的格數
- **手機上依內容撐高的面板**：排版前不知其高度，以 `ResizeObserver` 量測內容的高度，換算為格數（無條件進位，最多 8 格）後交由計算；內容變動時（例如搜尋後列數變少）重新量測並重新排版。此類面板寬度必為填滿，一列只有它自己，高度改變只使其下方的面板整排上下移動，不打亂左右的排列

---

## 面板內容的寬度

`DashboardPanel` 為 container（`container-type: inline-size`），內容元件依面板的寬度以 container query 調整，而非依整個螢幕。一般頁面沒有面板，不會觸發以下的窄版，現有頁面不受影響。

| 內容 | 面板過窄時 |
| --- | --- |
| table | 不處理，於面板內橫向捲動（表格本為檢視完整欄位而用） |
| gallery | 不處理，格線本已依寬度減少欄數 |
| 圖表 | 不處理，以 SVG 繪製，自行縮放 |
| detail、form | 欄位的名稱與值由左右兩欄改為上下兩行；form 使用 Vuetify 的輸入框，實作時確認是否需要調整 |
| profile | 不處理，標題與副標本已以刪節號截斷；⋮ 的選單 teleport 至 `body`，可超出面板 |
| deck | 窄版：只顯示標題與副標，隱藏左下與右下 |
| card | 窄版：省略第 3 層 |

- **3 格以下即為窄版**：deck 一列的 4 個圖示按鈕連同內距約 172px，card 約 160px；3 格（手機約 165–180px、電腦約 150–166px）放不下，4 格（約 200px 以上）可容納。手機與電腦每格的大小相近，以同一個門檻涵蓋兩者：container query 寫為寬度小於約 200px 時切換為窄版（container query 僅能使用長度），實作時以測試面板於瀏覽器中微調
- **動作列放不下時，先將文字按鈕改為圖示，仍放不下再換行**：每個 `PageAction` 皆有 `icon`，文字按鈕同時繪出圖示與文字，以 container query 切換顯示何者（改為圖示時以 `label` 作為 `aria-label`）；換行以 `flex-wrap` 達成
- **估計高度**（`contain-intrinsic-size`）：card 的高度主要來自 16:9 的大圖，改以 `cqw` 依寬度估算（例如 `calc(64px + 100cqw * 9 / 16 + …)`，實作時扣除外距與外框再校準），一般頁面中沒有容器時以視窗寬度計算；deck 與 profile 的高度取決於文字行數，窄版時以 container query 換用另一個固定值；gallery 已以 `aspect-ratio` 精確決定

---

## 小外殼與關注點

每個面板預設有一個小外殼（標題列，標題為 `DashboardPanel` 的 `title`），可由設計者關閉。小外殼除右側的「展開」鈕外不放動作，用來標示關注點：

- **點擊面板的任何地方即成為關注點**，以外框顏色標示
- **預設的關注點為第一個有小外殼的面板**
- **關閉小外殼的面板無法成為關注點**，因此不提供展開，適合圖表等純顯示的面板
- dashboard 中不顯示各面板的 FAB；新增等動作於展開後使用

App Bar 依狀態顯示：

| 狀態 | App Bar |
| --- | --- |
| 平時 | 搜尋（含篩選、排序） |
| 關注面板在多選模式 | 該面板的多選動作（例如批次刪除）與「取消」 |
| 面板已展開 | 該面板完整的外殼：← 鈕與面板的標題、動作、FAB、多選，與一般頁面相同 |

- **App Bar 的動作由 `DashboardPage` 統一決定**：`DashboardPage` provide `appBarActionsKey`，面板中的 `useAppBarActions` 交出的動作皆先交到此處（只有關注面板的會生效），再依上表決定是否顯示，由 `DashboardPage` 自己登記一次。「展開」鈕放在各面板的小外殼而非 App Bar，未關注的面板亦可直接展開

---

## 搜尋、篩選與排序

沿用「同一頁面中的多張表」的機制（見 [ui.md](ui.md#同一頁面中的多張表)）：

- `DashboardPage` 統一登記一次 `useListControls`，`tables` 列出各列表面板的表；各面板的 `useListPage` 偵測到位於 dashboard 中時不自行登記，並共用同一條 `query`
- **搜尋字串全頁共用**，打一次字，所有列表面板一起過濾
- **篩選與排序每張表各一份**，同時生效。同一張表出現於多個面板時，共用同一份條件
- 抽屜上方的表 chip，`current` 跟著關注面板
- **放大鏡只要有任一列表面板即出現**，不受關注點影響
- 一個面板的資料依序經過：整表 → 互動（依所選的父列篩出子列）→ 篩選 → 搜尋

---

## 多選

- **同一時間只有一個面板能多選**。長按某面板時，關注點先移到該面板，再進入多選
- **多選期間，其他面板視為不存在**：加上 `inert`，點擊與長按皆被忽略，並稍微調暗；捲動維持可用（`inert` 於觸控上的實際行為須於瀏覽器確認，若連捲動一併阻擋則改用其他方式）
- 取消多選後，其他面板恢復

---

## 展開

按下小外殼上的「展開」鈕，該面板成為關注點並就地放大，佔滿整個內容區，其他面板暫時隱藏：

- **展開時以同一個網址推入一筆 history**，於該筆的 state 記下展開的面板；按返回鍵回到前一筆即縮回。App Bar 左上角顯示 ← 鈕，作用與返回鍵相同
- **是否展開一律依目前這一筆 history 的 state 決定**：`DashboardPage` 於每次導覽完成後（`router.afterEach`）與掛載時讀取，按下「展開」鈕只推入 history，不直接改變狀態。因此瀏覽器的下一頁會再次展開，自展開的面板進入詳細頁再返回時仍為展開，重新整理後亦維持
- **動畫與換頁相同**：展開如同前進到新頁面，展開的面板自右側滑入；縮回如同返回，方向相反。換頁動畫以 View Transitions 截下導覽前後的畫面，不論前後是否為同一個元件，因此網址相同的展開亦適用，dashboard 不另寫動畫（見 [architecture.md](architecture.md#設計取捨)）
- **網址不變，KeepAlive 不重建此頁**：KeepAlive 以 `fullPath` 為 key，推入的一筆與原本的網址相同，面板中的狀態（分組的收合、多選、搜尋字串等）皆保留。router 的 `scrollBehavior` 對網址相同的推入回到頂端，返回時仍依瀏覽器記下的位置還原
- **展開期間，該面板與一般頁面相同**：FAB、App Bar 的動作、多選、`DetailPage` 的上下一筆箭頭與左右滑動皆恢復
- **互動的狀態保留**：例如子表面板展開後，仍只顯示所選父列的子列
- **App Bar 的標題沿用面板的名稱**（`DashboardPanel` 的 `title`），與小外殼上的標題相同。頁面以元件 import 時讀不到自己 `<route>` 的 `meta.title`，`_ref/` 中的列表亦無路由，因此標題一律由 dashboard 給定

不採用「換到該表自己的頁面」：dashboard 的面板未必有對應的獨立頁面，且互動篩出的結果會遺失。

---

## 互動（interactive）

### 選取狀態

- **每張表各記一筆**（例如 `selected.parent`、`selected.child`），而非全頁只記一筆。選取父列後，再於篩出的子列中選取一筆，父列的選取不會被覆蓋
- **僅存於記憶體，不寫入網址**：選取狀態存於 `DashboardPage` 的元件中，dashboard 與其他頁面同樣由 KeepAlive 快取，離開後再回來（例如自面板進入編輯頁再返回）仍保留，不需額外處理。重新整理，或 dashboard 被擠出快取（KeepAlive 的上限為 50 個頁面）時清除。「離開就取消」僅適用於多選，與互動的選取無關
- **父列的選取改變時，清除子表的選取**：原本選取的子列可能已不在篩選結果中
- **選取的那一筆被搜尋或篩選隱藏時，選取保留**：子表照樣只顯示它的子列（亦經過搜尋與篩選），不因輸入而跳回全部
- **選取的那一筆被刪除時，自動取消該表的選取**，並連帶清除子表的選取
- **選取的那一列以左側一條主色的細邊標示**，與多選的主色淡底區分，兩者可同時出現

### 哪些面板會連動

以選取的那一筆為準，與它直接相關的面板皆會連動：

| 面板 | 連動方式 |
| --- | --- |
| 同一張表的詳細面板 | 顯示選取的那一筆 |
| 同一張表的列表面板 | 標示選取的那一列，不篩選 |
| 子表（有 ref 欄位指向它）的列表面板 | 只顯示屬於它的子列 |
| 父表（它的 ref 欄位指向的表）的詳細面板 | 顯示它所屬的那一筆 |

- **同一張表有多個 ref 欄位指向同一張表時**（例如「轉帳」的轉出帳戶與轉入帳戶）：子表的列表預設任一欄位等於所選父列即列出；父表的詳細面板無法自行判斷，預設取第一個。以 `DashboardPanel` 的 `via` 指定只經由哪個欄位連動：子表的列表面板為自己的欄位，父表的詳細面板為子表的欄位。`via` 不是任何一張表的 ref 欄位時，開發模式下於 console 警告
- **不同父表的條件同時成立**：子表指向兩張父表，兩張皆有選取時，只列出同時屬於兩者的子列
- **只連動一層**：隔一層的關係（例如子表的子表）不連動，避免連鎖過深。指向自己的 ref 欄位不連動
- **尚未選取父列時，子表面板顯示全部子列**
- **再點一次選取的那一列即取消選取**，子表面板回到顯示全部子列
- **展開的詳細面板中，上下一筆與左右滑動改為換選取**，不換頁；順序為最後一個關注的列表面板所發布者（列表面板僅於關注時發布順序）
- **表格（`DataTable`）不支援選取**：例如詳細頁子表區塊中的表格，點擊仍照常換頁
- **詳細面板尚無選取時，只顯示欄位名稱**：以一筆空的列交給 `DataDetail`，各欄位的值格式化為空字串；`DetailPage` 於面板中不顯示「找不到這筆資料」，依賴該列的區塊（例如子表區塊）與標頭不渲染

---

## 與現有機制的關係

| 現有機制 | dashboard 中的處理 |
| --- | --- |
| `TabPanel` provide 的「是否為當前面板」（`panelActiveKey`） | ✅ `DashboardPanel` provide 同一份，「當前」改為關注面板；`useListControls` 等登記因此自動跟著關注點 |
| `useAppBarActions` | ✅ 僅於關注面板多選中或已展開時生效：`DashboardPage` provide `appBarActionsKey` 收下面板的動作，由自己統一登記；`DashboardPanel` 包一層 `appBarSelectionKey`，記下面板是否在多選（見「小外殼與關注點」） |
| App Bar 的標題與 ← 鈕 | ✅ 新增 `useAppBarHeading()`：登記時以給定的標題與返回動作取代路由的標題與 ← 鈕。`DashboardPage` 於展開時登記面板的標題與縮回 |
| `PageFab` | ✅ 僅於該面板已展開時顯示：讀取 `usePanelFullPage()`（`DashboardPanel` provide「是否已展開」，不在面板中時一律為 true） |
| `useRowClick` | ✅ 開啟互動時，點擊一列改為選取，不導覽：`ListPage` 交給每一列的 `props` 另含 `current`、`pickable` 與 `pick`，四個列表元件據此標示選取的那一列並改變點擊 |
| `DetailPage` 的 `RecordNav`（`position: fixed`）與左右滑動 | ✅ 同樣讀取 `usePanelFullPage()`：面板中停用，展開時恢復；`useSiblingNav` 於 dashboard 中改為換選取 |
| router 的 `scrollBehavior` | ✅ 網址相同的推入（展開）回到頂端（見「展開」） |
| `DetailPage` 沒有資料時顯示「找不到這筆資料」 | ✅ 面板中尚無選取時，改為只顯示欄位名稱：`DataDetail` 的 `row` 可為 `null`（見「哪些面板會連動」） |
| `useListPage` 的自動登記 | ✅ 讀取「共用的列表控制」（`TabPage` 與 `DashboardPage` 皆 provide）：不自行登記，改用共用的 `query` 並將表交由外層統一登記；於 dashboard 中 `rows` 另經互動的篩選（與 `scope` 同一步） |
| `TabPage` | ✅ 改為 provide「共用的列表控制」，各頁籤的列表自動共用搜尋（見「多個列表共用搜尋」） |
| `useListPage` 的選項 | ✅ 新增選用的 `scope`，於篩選與搜尋之前縮小範圍；dashboard 的互動篩選亦經由此步驟（見「範例：拆分含頁籤的列表頁」） |
| 路由插件 | ✅ `exclude` 加入 `src/pages/**/_ref/**`（見「只供嵌入的頁面」） |
| `useRecordPage` | ✅ 位於 dashboard 中時，id 取自 `useDashboardSelection()`（`DashboardPage` provide），不呼叫 `useRouteId` |
| 「離開就取消選取」 | 維持；另加「多選期間其他面板不可點」 |

---

## 待定事項

- 手機與電腦排版的切換門檻：暫定沿用 Vuetify `mobile` 的 1145px；平板直放應使用 24 格，門檻可能須調低，例如 840px
