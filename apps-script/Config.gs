// 唯一須填寫的檔案。其他檔案皆不綁定特定的試算表與表。試算表的 id 存於指令碼屬性（見 README.md）

// 前端的表代稱 → Sheet 分頁。代稱須與前端 schemas 的 key 完全相同（前端送出 ?table=代稱）
const TABLES = {
  // 代稱: { sheetName: '分頁名稱', idColumn: 'ID 欄的表頭文字' },
}

// 表頭所在的列號（1 起算），資料從下一列開始
const HEADER_ROW = 1

// 等待鎖的上限。逾時即回傳錯誤，由前端重送
const LOCK_TIMEOUT_MS = 30 * 1000

// 登入方式，須與前端 config/app.ts 的 authMethod 相符：null 對 'none'，'password' 對 'custom'（見 docs/auth.md）
const AUTH = null
