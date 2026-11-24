# PageActions

頁面的動作：放置 [PageFab](../shell/PageFab.md)，並將 App Bar 的動作登記至 `AppShell`。

**只供頁面元件使用**：[ListPage](ListPage.md)、[DetailPage](DetailPage.md) 與 [ChartPage](ChartPage.md) 內部放置此元件。頁面將動作交給這些元件的 `fab` 與 `appBar`。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `fab` | `(PageAction \| null)[]?` | 右下角的 FAB |
| `appBar` | `(PageAction \| null)[]?` | App Bar 右側的動作 |

## 備註

- **App Bar 的動作只有一份**，後登記的取代先登記的。建立時沒有提供 `appBar` 的元件不登記，頁面自行以 `useAppBarActions` 登記的動作因此保留
- 同一頁中只有一個元件提供 `appBar`。頁籤與 dashboard 的面板除外，只有目前的頁籤或關注面板生效（見 [TabPage](../panel/TabPage.md) 與 [DashboardPage](../panel/DashboardPage.md)）
