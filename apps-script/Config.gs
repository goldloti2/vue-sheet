// 唯一要填的檔案。其他檔都不綁特定的試算表與表

// 試算表的 id（網址 /d/ 與 /edit 之間那段）；留空＝用綁定的試算表
const SPREADSHEET_ID = ''

// 前端的表代稱 → Sheet 分頁。代稱要跟前端 schemas 的 key 一字不差（前端送的是 ?table=代稱）
const TABLES = {
  // 代稱: { sheetName: '分頁名稱', idColumn: 'ID 欄的表頭文字' },
}

// 表頭在第幾列（1 起算），資料從下一列開始
const HEADER_ROW = 1

// 等鎖的上限；逾時就回錯誤讓前端重送
const LOCK_TIMEOUT_MS = 30 * 1000

// 登入方式，要跟前端 config/app.ts 的 authMethod 對得上（見 docs/auth.md）：
// null＝不驗證（前端 'none'）；'password'＝Auth.gs 的帳號密碼示範模組（前端 'custom'）
const AUTH = null
