# TabPage

頁籤列加上內容區。
- 切換時，內容依頁籤的順序左右滑動：前往右側的頁籤時，新內容從右側進入，舊內容往左側離開。方向與換頁動畫一致
- 動畫由 Vuetify 的 `v-window` 提供，不經過換頁動畫的 View Transitions

**頁籤列不畫在頁面中**：
- 此元件將頁籤列登記給 `AppShell`，由 App Bar 下方的 extension 顯示。因此捲動內容時，頁籤列固定在最上方，也不隨換頁動畫滑動
- 頁面只須放置此元件，無須處理位置。離開頁面時（包括被 KeepAlive 收起），頁籤列自動消失
- 因此此元件須有 `AppShell`，與 `PageFab`、`useAppBarActions` 相同
- 搜尋模式下，頁籤列仍然保留

每個頁籤顯示為獨立的面板。看過的面板留在 DOM 中，以 `v-show` 隱藏，因此各自保有捲動位置與展開狀態。各面板的內容不必同構：頁籤只是容器，各自放置各自的內容。

**面板知道自己是否為目前的頁籤**：
- 此元件在每個頁籤外包一層 `TabPanel`，`provide` 一份「目前是否輪到此面板」
- `PageFab`、`useAppBarActions`、`useBottomActions` 皆讀取這份資訊。因此面板中可直接放整個列表，包括列表自己的 FAB 與 App Bar 動作。不是目前頁籤的面板，不會掛出這些動作
- 不在 `TabPage` 中的頁面一律視為目前的頁籤，既有的頁面無須修改

**兩個訊號的選擇**：兩者都來自頁面的頁籤 `v-model`，回答的問題不同：

| 程式所在的位置 | 使用 | 回答的問題 |
| --- | --- | --- |
| 掛在某個面板中（元件，或面板內元件呼叫的 composable） | `usePanelActive()` | 「**此面板**是否為目前的面板」 |
| 在面板外（頁面層的 composable、`TabPage` 之外的元件） | `useCurrentTab()` | 「目前選的是哪個頁籤」 |

同一條規則只接其中一個，依程式所在的位置選擇。`useMultiSelect` 屬於頁面層，使用 `useCurrentTab()`。

常見的用法是依某個 `select` 欄位篩選列表，頁籤直接讀取該欄位的 `options`。讀取 `options` 前，須先以 `column?.type === 'select'` 縮小型別，此判斷不可省略。

## Usage

範本見 `template/pages/tab-list.vue`：依 select 欄位分頁籤，每個頁籤放一個只供引用的列表（`template/pages/_ref/list.vue`）。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `string` | **必填**，目前選取的頁籤 |
| `tabs` | `string[]` | **必填**，同時決定頁籤的順序與滑動的方向 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ tab: string }` | 各頁籤共用同一份 template 時使用 |
| `[頁籤字串]` | `{ tab: string }` | 某個頁籤要放不同的內容時，使用與該頁籤同名的具名 slot。未提供時改用 `default` |

## 備註

- 只需要頁籤列、不需要內容區時，直接使用 Vuetify 的 `v-tabs`，不使用此元件。頁面自行放置的 `v-tabs` 會隨內容捲動
- 一個畫面同時掛兩個 `TabPage` 時，兩者的頁籤列互相覆蓋，因為 App Bar 的 extension 只有一份
- **不可嵌套**：`TabPage` 與 `DashboardPage` 不可互相嵌套，也不可嵌套自身。開發模式下於 console 警告
- **頁籤中的列表自動共用搜尋**（見 [search.md](../../topics/search.md#同一頁面中的多張表)）：
  - 此元件 provide 一份共用的列表控制。各頁籤中的 `useListPage` 不自行登記，改為加入這份控制
  - 搜尋字串共用一條。同一張表共用一份篩選與排序，不同的表各有一份
  - 此元件統一登記一次。其中沒有列表時不登記
- **各頁籤可放不同的表**（例如兩張表的列表），也可放從其他 `.vue` 檔 import 的列表。各面板掛出各自的 FAB 與 App Bar 動作，搜尋與篩選照上一項自動共用
- **同一個頁籤中的內容共用一組動作**：頁籤只是同一張表的篩選、面板沒有分開時，若要「不同頁籤不同 FAB」，由頁面自行以 `computed(() => 目前頁籤 === 'A' ? actionsA : actionsB)` 傳給 `PageFab`
- 鍵盤操作：焦點停在頁籤列時使用方向鍵，此功能由 `v-tabs` 底層的 `VSlideGroup` 提供
- `v-window` 的兩個 prop 固定關閉：
  - `:show-arrows="false"`：須明確設為 `false`，預設值 `undefined` 會顯示左右箭頭
  - `:touch="false"`：不以左右滑動切換頁籤
