// 複製到 src/schema/__table__.ts
import type { RowBase, TableSchema } from './types'
import { prefixedId } from './types'

// 每個 column 一個欄位；id 與 $label 來自 RowBase，不放進 columns。
// 虛擬欄位與 ref 對應的 $欄位 也要列在這裡（readonly），schema 會對著這個介面檢查 key 跟型別
export interface __Table__Row extends RowBase {
  name: string | null
  amount: number | null
  date: Date | null
  // readonly total: number | null
  // readonly $parent?: ParentRow
}

export const __table__Schema: TableSchema<__Table__Row> = {
  sheetName: '範本',
  idColumn: 'TPL-ID',
  // 用哪一欄稱呼一列（可省略，省略就是 id）：row.$label、別的表 ref 到這裡、選擇器清單都顯示它
  labelColumn: 'name',
  // 怎麼發新 id，各表自己決定。prefixedId 是現成的前綴式（TPL-11eef1a8）；
  // 要別種格式就自己寫一個 () => string 塞進來
  newId: prefixedId('TPL'),
  columns: [
    // label 就是 Sheet 表頭文字；兩者不同時才另外加 sheetHeader: '實際表頭'
    { key: 'name', label: '名稱', type: 'text', required: true },
    { key: 'amount', label: '金額', type: 'number', min: 0 },
    { key: 'date', label: '日期', type: 'date' },

    // 其他可用型別：
    // { key: 'status', label: '狀態', type: 'select', options: ['選項A', '選項B'] },
    // ref 欄位在表單是選擇器、顯示時是對方的名字（對方 schema 的 labelColumn），這裡不用多寫：
    // { key: 'parent', label: '上層', type: 'ref', refTable: 'parent' },

    // 新增表單的初始值用 default，可省略。值或函式都可以，函式是打開表單那一刻才求值：
    // { key: 'status', label: '狀態', type: 'select', options: [...], default: '選項A' },
    // { key: 'date', label: '日期', type: 'date', default: () => new Date() },

    // 驗證用的約束，都可省略。空著就是「不限制」：
    //   required: true   空值就擋下送出，所有型別通用
    //   min / max        只有 number 有，同時當輸入欄的上下限與送出前的檢查
  ],

  // 以下都可省略
  // 虛擬欄位：不在 Sheet 上、讀的時候才算出來的欄位，store 會掛成 row 上的 getter，用法跟真實欄位一樣
  // （row.total 直接讀、可排序分組、DataDetail/DataTable 自動顯示）。type 決定 value 的回傳型別，row 就是 __Table__Row；
  // 要看子表就用 needs 宣告，related('子表') 才拿得到指向這一列的資料；父表直接讀 row.$parent（ref 欄位自動掛）
  // virtualColumns: [
  //   { key: 'total', label: '總額', type: 'number', value: row => (row.amount ?? 0) * 2 },
  //   { key: 'title', label: '名稱', type: 'text', needs: ['child'], value: (_row, { related }) => related<ChildRow>('child')[0]?.name ?? '(空)' },
  //   { key: 'parentName', label: '上層名稱', type: 'text', value: row => row.$parent?.name ?? '' },
  // ],
  // 列表頁預設排序，多筆依序當 tiebreaker
  defaultSort: [
    { key: 'date', direction: 'asc' },
  ],
  // detail 頁欄位順序；省略＝沿用 columns 順序。虛擬欄位的 key 也可以排進來
  detailOrder: ['name', 'amount', 'date'],
  // 表單頁欄位順序；省略＝沿用 columns 順序
  formOrder: ['name', 'amount', 'date'],
}
