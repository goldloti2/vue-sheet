# TabView

頁籤 + 內容區。切換時內容依頁籤順序左右滑動（往右邊的頁籤＝新內容從右進、舊的往左出），跟頁面轉場是同一組動畫。

**頁籤列不畫在頁面裡**：這個元件把它登記給 `AppShell`，由 App Bar 底下的 extension 顯示，所以捲動內容時頁籤固定在最上面，也不會跟著換頁動畫滑動。頁面只放這個元件、不用管位置；離開頁面（含被 KeepAlive 收起來）時頁籤列自動消失。也因此它需要 `AppShell`，跟 `PageFab`、`useAppBarActions` 一樣。搜尋模式下頁籤仍然留著——搜尋與篩選本來就是跨頁籤生效的。

每個頁籤都會被渲染成獨立的面板，看過的會留在 DOM 裡（`v-show` 隱藏），所以各自保有捲動位置與展開狀態。內容不必同構——頁籤只是容器，各放各的。

**面板知道自己是不是當前頁籤**：這個元件在每個頁籤外面包一層 `TabViewPanel`，`provide` 一份「現在輪到我沒」。`PageFab`、`useAppBarActions`／`useBottomActions`、`useListOrder` 都會讀它，所以面板裡直接放整個列表（含自己的 FAB、App Bar 動作）是可以的，不是當前頁籤的那些不會掛出去。不在 `TabView` 裡的頁面一律算當前，現有頁面零改動。

常見用法是依某個 `select` 欄位篩選列表，選項可以直接讀該欄位的 `options`，不用另外維護一份重複的清單（取 `options` 前要先用 `column?.type === 'select'` 縮小型別，這個判斷不能省）。

## Usage

```vue
<script lang="ts" setup>
  import { ref } from 'vue'
  import TabView from '@/components/ui/shell/TabView.vue'

  const tabs = ['選項1', '選項2']
  const selected = ref(tabs[0])
</script>

<template>
  <TabView v-model="selected" :tabs="tabs">
    <template #default="{ tab }">
      <v-container>內容{{ tab }}</v-container>
    </template>
  </TabView>
</template>
```

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `string` | **必填**，目前選中的頁籤 |
| `tabs` | `string[]` | **必填**，同時決定頁籤順序與滑動方向 |

## Slots

| slot | scope | 說明 |
| --- | --- | --- |
| `default` | `{ tab: string }` | 每個頁籤共用同一份 template 時用這個 |
| `[頁籤字串]` | `{ tab: string }` | 某個頁籤要放不一樣的東西時，用跟它同名的具名 slot；沒給就退回 `default` |

## 備註

- 只要頁籤列、不要內容區的話，直接用 Vuetify 的 `v-tabs`，不用這個元件（自己擺的 `v-tabs` 會跟著內容捲動）
- 一個畫面同時掛兩個 `TabView` 會互相蓋掉頁籤列（App Bar 的 extension 只有一份）
- **每個頁籤放不同的表**（例如兩張表的列表）是支援的：面板各自掛自己的 FAB 與 App Bar 動作，搜尋與篩選則由頁面登記一次、每張表各一份條件（見 [ui.md](../ui.md#篩選)）
- **同一個頁籤裡的內容仍然共用一組動作**。「不同頁籤不同 FAB」若頁籤只是同一張表的篩選（面板沒有分開），就由頁面自己 `computed(() => 目前頁籤 === 'A' ? actionsA : actionsB)` 餵給 `PageFab`
- 鍵盤操作是焦點停在頁籤列時用方向鍵（`v-tabs` 底層的 `VSlideGroup` 提供）
- `v-window` 的兩個 prop 是刻意關掉的，改之前先看清楚：
  - `:show-arrows="false"` — 預設值是 `undefined`，而判斷式是 `showArrows !== false`，所以不明確關掉就會在內容上疊一層左右箭頭按鈕
  - `:touch="false"` — 開了就能左右滑動切頁籤。它只綁 `touchstart`/`touchmove`/`touchend`，**桌機用滑鼠拖曳沒有反應**，要測必須用 DevTools 的裝置模擬或真觸控裝置。注意會跟 `DataTable` 的橫向捲動搶手勢
