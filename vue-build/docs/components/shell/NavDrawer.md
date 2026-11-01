# NavDrawer

左側的側邊欄：上方為 App 名稱，中間為可展開的頁面分組，最下方為「登出」。由 `AppShell` 放置，頁面無須使用。外觀與用途見 [design/README.md](../../design/README.md) 的「導覽」。

## Props

| Prop | 型別 | 說明 |
| --- | --- | --- |
| `sections` | `AppNavSection[]` | 頁面清單，依組列出。每組為 `{ title?, icon?, items }`，`items` 的寫法與底部導覽列的 `navItems` 相同 |
| `open` | `boolean` | `v-model:open`，側邊欄是否開啟 |

## 備註

- **項目來自 `config/navigation.ts` 的 `drawerSections`**：`App.vue` 交給 `AppShell`，再由 `AppShell` 交給此元件。清單與底部導覽列的 `navItems` 各自設定，同一頁可以兩處皆有
- **有 `title` 的組可以展開與收合**：組的標題為 Vuetify 的 `v-list-group`，`icon` 選填，顯示於標題前。沒有 `title` 的組不收合，項目直接列出
- **目前的頁面所在的組自動展開**：網址改變時展開該組，其他組維持使用者的選擇
- **預設收起**，以 App Bar 左側的選單鍵開啟與收起：
  - 電腦版：側邊欄與內容並排（`permanent`），換頁時不收起
  - 手機版：側邊欄浮在內容上，換頁後收起
  - 手機版與電腦版依 `useCompactLayout()` 判斷
- **換頁與底部導覽列相同**：不留下上一頁（`replace`）。目前的頁面以 Vuetify 的 active 樣式標示
- **側邊欄的頁面為頂層頁面**：`AppShell` 於這些頁面的 App Bar 左側顯示選單鍵，不顯示返回鍵。換頁動畫的方向見 [pages.md](../../topics/pages.md#換頁動畫) 的「換頁動畫」
- **「登出」在 `config/app.ts` 的 `authMethod` 不是 `'none'` 時出現**：有未推送的變更時先詢問。登出後未推送的變更留在佇列中，重新登入後照常推送
