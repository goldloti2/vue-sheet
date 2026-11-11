// App 名稱，顯示於沒有 route.meta.title 的頁面，也作為網頁的標題與安裝後的名稱
export const appName = '應用程式'

// 登入方式，須與後端 Config.gs 的 AUTH 相同（見 docs/auth.md）。'google' 尚未實作
type AuthMethod = 'none' | 'custom' | 'google'
export const authMethod: AuthMethod = 'none'

// 詳細頁欄位的排法：'side' 為左右並排，'stacked' 為名稱在上。單一頁面以 DetailPage 的 layout 覆寫
export type DetailFieldLayout = 'side' | 'stacked'
export const detailFieldLayout: DetailFieldLayout = 'side'

// 計時推送：有未推送的變更，且最後一次修改後經過此秒數時，自動推送並重新抓取。null 為不啟用
export const autoPushDelay: number | null = null
