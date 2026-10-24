// 複製到 src/schema/tables/__table__.ts
//
// 其他欄位型別、驗證、初始值、虛擬欄位與跨表關聯，見 docs/topics/schema.md。
// 每個設定的說明寫於 src/schema/types.ts 的型別上。
import type { RowBase, TableSchema } from '../types'
import { prefixedId } from '../types'

// id 與 $label 來自 RowBase。虛擬欄位與 row 上的 getter 也須以 readonly 列於此處，schema 依此介面檢查 key 與型別
export interface __Table__Row extends RowBase {
  code: string | null
  name: string | null
  amount: number | null
  date: Date | null
  status: string | null
}

export const __table__Schema: TableSchema<__Table__Row> = {
  // 表於畫面上的名稱（表的 chip、頁籤比對）
  tableLabel: '範本',
  // 主鍵的欄位，建立後不可修改
  idColumn: 'code',
  // 稱呼一列所用的欄位，省略時為 id。row.$label、ref 的顯示與選擇器清單皆使用此欄
  labelColumn: 'name',
  // 新增時主鍵留空即以此產生（例如 TPL-11eef1a8）。省略時主鍵為必填
  newId: prefixedId('TPL'),
  columns: [
    // 欄位只描述資料本身，列表頁的用法寫於下方的清單
    // label 即為 Sheet 的表頭文字，兩者不同時才另加 sheetHeader: '實際表頭'
    // 主鍵未列入 formOrder 時一律自動產生。列入時可自行輸入，留空才自動產生
    { key: 'code', label: '編號', sheetHeader: 'TPL-ID', type: 'text' },
    { key: 'name', label: '名稱', type: 'text', required: true },
    { key: 'amount', label: '金額', type: 'number', min: 0 },
    { key: 'date', label: '日期', type: 'date' },
    // select 的選項也是 pages/tab-list.vue 的頁籤。無須依狀態分頁籤時可刪除此欄
    { key: 'status', label: '狀態', type: 'select', options: ['進行中', '已完成'] },
  ],
  // 以下皆可省略。順序類的設定省略時依 columns 的順序
  // 可搜尋或篩選的欄位，text 與 ref 進搜尋列，其餘進篩選抽屜。順序即為抽屜第一層的順序
  searchable: ['name', 'date', 'amount', 'status'],
  // 可排序的欄位，順序即為排序面板的順序
  sortable: ['date', 'amount'],
  defaultSort: [
    { key: 'date', direction: 'asc' },
  ],
  detailOrder: ['name', 'status', 'amount', 'date'],
  formOrder: ['name', 'status', 'amount', 'date'],
}
