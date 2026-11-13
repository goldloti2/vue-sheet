# NavDrawer

左側的側邊欄：上方為 App 名稱，中間為可展開的頁面分組，最下方為「登出」。手機版浮在內容上，電腦版固定於左側。由 `AppShell` 放置，頁面無須使用。外觀與用途見 [design/README.md](../../design/README.md) 的「導覽」。

## Props

| Prop | 型別 | 說明 |
| --- | --- | --- |
| `navItems` | `AppNavItem[]` | 底部導覽列的頁面。電腦版列於最上方 |
| `sections` | `AppNavSection[]` | 頁面清單，依組列出。每組為 `{ title?, icon?, items }`，`items` 的寫法與 `navItems` 相同 |
| `open` | `boolean` | `v-model:open`，手機版的側邊欄是否開啟 |
| `rail` | `boolean` | `v-model:rail`，電腦版的側邊欄是否收合為圖示列 |

## 備註

- **項目來自 `config/navigation.ts` 的 `drawerSections`**：`App.vue` 交給 `AppShell`，再由 `AppShell` 交給此元件。清單與底部導覽列的 `navItems` 各自設定，同一頁可以兩處皆有
- **有 `title` 的組可以展開與收合**：組的標題為 Vuetify 的 `v-list-group`，`icon` 選填，顯示於標題前。沒有 `title` 的組不收合，項目直接列出
- **組內的頁面只縮排一層**：不另外縮一個圖示欄的寬度，縮排的大小見 [design/README.md](../../design/README.md) 的「導覽」
- **App 名稱所在的最上一列與「登出」固定**：頁面清單超出高度時，只有清單捲動
- **目前的頁面所在的組自動展開**：網址改變時展開該組，其他組維持使用者的選擇
- **手機版預設收起**，以 App Bar 左側的選單鍵開啟：
  - 開啟後浮在內容上（`temporary`）
  - 點擊側邊欄以外的地方，或換頁後收起
- **電腦版固定於左側**（`permanent`），佔用內容區左側的寬度：
  - 最上方為 `navItems`，接著為 `sections`。`sections` 中與 `navItems` 重複的頁面不再列出（`navSections.ts` 的 `desktopSections`）
  - 最上一列的收合鍵切換 `rail`。收合時為 Vuetify 的 `rail`，組不展開，所有頁面直接以圖示列出，滑鼠停在圖示上時顯示名稱
  - `AppShell` 只在執行期間記住 `rail`，預設收合
  - 寬度與最上一列的外觀見 [design/README.md](../../design/README.md) 的「導覽」
- **換頁與底部導覽列相同**：不留下上一頁（`replace`）。目前的頁面以主色標示，外觀見 [design/README.md](../../design/README.md) 的「導覽」
- **側邊欄的頁面為頂層頁面**：`AppShell` 於這些頁面不顯示返回鍵。手機版的 App Bar 左側為選單鍵，電腦版不顯示左側圖示。換頁動畫的方向見 [pages.md](../../topics/pages.md#換頁動畫) 的「換頁動畫」
- **「登出」在 `config/app.ts` 的 `authMethod` 不是 `'none'` 時出現**：有未推送的變更時先詢問。登出後未推送的變更留在佇列中，重新登入後照常推送
