// App 名稱：沒有指定 route.meta.title 的頁面顯示這個。index.html 的 <title> 要跟著一起改
export const appName = '應用程式'

// 登入方式，要跟後端 Config.gs 的 AUTH 對得上（見 docs/auth.md）。'google' 尚未實作
type AuthMethod = 'none' | 'custom' | 'google'
export const authMethod: AuthMethod = 'none'

// 詳細頁欄位的排法：'side' 名稱與值左右並排，'stacked' 名稱在上、值在下；單一頁面以 DetailPage 的 layout 覆寫
export type DetailFieldLayout = 'side' | 'stacked'
export const detailFieldLayout: DetailFieldLayout = 'side'
