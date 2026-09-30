// 複製到 src/schema/tables/__table__.ts
//
// 更多欄位型別（select／ref／image…）、驗證、初始值、虛擬欄位、跨表關聯，
// 見 docs/schema.md；每個設定的解釋寫在 src/schema/types.ts 的型別上。
import type { RowBase, TableSchema } from './types'
import { prefixedId } from './types'

// id 與 $label 來自 RowBase，不放進 columns。
// 虛擬欄位、ref 對應的 $欄位key（父列）、指向這張表的 $子表_欄位key（子列陣列）也要列在這裡（readonly），
// schema 會對著這個介面檢查 key 跟型別
export interface __Table__Row extends RowBase {
  name: string | null
  amount: number | null
  date: Date | null
}

export const __table__Schema: TableSchema<__Table__Row> = {
  sheetName: '範本',
  idColumn: 'TPL-ID',
  // 用哪一欄稱呼一列（可省略，省略就是 id）：row.$label、別的表 ref 到這裡、選擇器清單都顯示它
  labelColumn: 'name',
  // 怎麼發新 id，各表自己決定。prefixedId 是現成的前綴式（TPL-11eef1a8）
  newId: prefixedId('TPL'),
  columns: [
    // label 就是 Sheet 表頭文字；兩者不同時才另外加 sheetHeader: '實際表頭'
    // searchable 開了才進搜尋列（text／ref）或篩選抽屜（select／number／date／duration），預設關
    // sortable 開了才進排序面板，預設關（備註這種長文字就不用開）
    { key: 'name', label: '名稱', type: 'text', required: true, searchable: true, sortable: true },
    { key: 'amount', label: '金額', type: 'number', min: 0, sortable: true },
    { key: 'date', label: '日期', type: 'date', sortable: true },
  ],
  // 以下都可省略。順序類的省略就沿用 columns 的順序
  defaultSort: [
    { key: 'date', direction: 'asc' },
  ],
  detailOrder: ['name', 'amount', 'date'],
  formOrder: ['name', 'amount', 'date'],
}
