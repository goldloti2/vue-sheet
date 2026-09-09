// 複製到 src/schema/__table__.ts
import type { TableSchema } from './types'

// 每個 column 一個欄位；id 是系統欄位，不放進 columns
export interface __Table__Row {
  id: string
  name: string | null
  amount: number | null
  date: Date | null
}

export const __table__Schema: TableSchema = {
  sheetName: '範本',
  idColumn: 'TPL-ID',
  columns: [
    // label 就是 Sheet 表頭文字；兩者不同時才另外加 sheetHeader: '實際表頭'
    { key: 'name', label: '名稱', type: 'text', required: true },
    { key: 'amount', label: '金額', type: 'number', min: 0 },
    { key: 'date', label: '日期', type: 'date' },

    // 其他可用型別：
    // { key: 'status', label: '狀態', type: 'select', options: ['選項A', '選項B'] },
    // { key: 'parent', label: 'Parent', type: 'ref', refTable: 'parent' },

    // 新增表單的初始值用 default，可省略。值或函式都可以，函式是打開表單那一刻才求值：
    // { key: 'status', label: '狀態', type: 'select', options: [...], default: '選項A' },
    // { key: 'date', label: '日期', type: 'date', default: () => new Date() },

    // 驗證用的約束，都可省略。空著就是「不限制」：
    //   required: true   空值就擋下送出，所有型別通用
    //   min / max        只有 number 有，同時當輸入欄的上下限與送出前的檢查
  ],

  // 以下三個都可省略
  // 列表頁預設排序，多筆依序當 tiebreaker
  defaultSort: [
    { key: 'date', direction: 'asc' },
  ],
  // detail 頁欄位順序；省略＝沿用 columns 順序。畫面上的計算欄位（extraFields）也可以排進來
  detailOrder: ['name', 'amount', 'date'],
  // 表單頁欄位順序；省略＝沿用 columns 順序
  formOrder: ['name', 'amount', 'date'],
}
