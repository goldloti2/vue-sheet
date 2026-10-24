// App 名稱，顯示於沒有 route.meta.title 的頁面。修改時須一併修改 index.html 的 <title>
export const appName = '應用程式'

// 登入方式，須與後端 Config.gs 的 AUTH 相同（見 docs/auth.md）。'google' 尚未實作
type AuthMethod = 'none' | 'custom' | 'google'
export const authMethod: AuthMethod = 'none'

// 詳細頁欄位的排法：'side' 為左右並排，'stacked' 為名稱在上。單一頁面以 DetailPage 的 layout 覆寫
export type DetailFieldLayout = 'side' | 'stacked'
export const detailFieldLayout: DetailFieldLayout = 'side'
