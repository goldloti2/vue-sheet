// 這張表用哪份 mock CSV —— 每個專案自己的內容，加一張表就多註冊一筆
// 正式後端接上後，整個 mock/ 資料夾（含這個檔）都會刪掉

import type { TableKey } from '@/schema'

export const mockCsv: Partial<Record<TableKey, string>> = {}
