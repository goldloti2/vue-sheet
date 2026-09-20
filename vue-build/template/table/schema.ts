// 複製到 src/schema/__table__.ts
import type { RowBase, TableSchema } from './types'
import { prefixedId } from './types'

// 每個 column 一個欄位；id 與 $label 來自 RowBase，不放進 columns。
// 虛擬欄位、ref 對應的 $欄位key（父列）、指向這張表的 $子表_欄位key（子列陣列）也要列在這裡（readonly），
// schema 會對著這個介面檢查 key 跟型別
export interface __Table__Row extends RowBase {
  name: string | null
  amount: number | null
  date: Date | null
  // readonly total: number | null
  // readonly $parent?: ParentRow
  // readonly $child_parent: ChildRow[]
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
    // searchable 開了才進搜尋列（text / ref）；其他型別開了是給篩選用（還沒做）。預設關
    { key: 'name', label: '名稱', type: 'text', required: true, searchable: true },
    { key: 'amount', label: '金額', type: 'number', min: 0 },
    { key: 'date', label: '日期', type: 'date' },

    // 其他可用型別：
    // { key: 'status', label: '狀態', type: 'select', options: ['選項A', '選項B'] },
    // ref 欄位在表單是選擇器、顯示時是對方的名字（對方 schema 的 labelColumn），這裡不用多寫：
    // { key: 'parent', label: '上層', type: 'ref', refTable: 'parent' },
    // 對方那筆被刪時要連這筆一起刪就加 onDelete（不加＝留著，ref 指向不存在的 id）：
    // { key: 'parent', label: '上層', type: 'ref', refTable: 'parent', onDelete: 'cascade' },

    // 新增表單的初始值用 default，可省略。值或函式都可以，函式是打開表單那一刻才求值：
    // { key: 'status', label: '狀態', type: 'select', options: [...], default: '選項A' },
    // { key: 'date', label: '日期', type: 'date', default: () => new Date() },

    // 驗證用的約束，都可省略。空著就是「不限制」：
    //   required: true   空值就擋下送出，所有型別通用
    //   min / max        只有 number 有，同時當輸入欄的上下限與送出前的檢查
    //   validate         自己的規則，內建檢查過了、而且有值時才叫；value 跟 type 同型別、row 是整列，回錯誤訊息或 null
    // { key: 'endDate', label: '結束日', type: 'date', validate: (value, row) => row.date && value < row.date ? '不能早於日期' : null },
  ],

  // 以下都可省略
  // 虛擬欄位：不在 Sheet 上、讀的時候才算出來的欄位，store 會掛成 row 上的 getter，用法跟真實欄位一樣
  // （row.total 直接讀、可排序分組、DataDetail/DataTable 自動顯示）。type 決定 value 的回傳型別，row 就是 __Table__Row；
  // 父表讀 row.$parent（ref 欄位自動掛）、子表讀 row.$子表_欄位（例如 child 表用 parent 欄位指過來就是 row.$child_parent，
  // 照子表 defaultSort 排），關聯的表會一起載
  // virtualColumns: [
  //   { key: 'total', label: '總額', type: 'number', value: row => (row.amount ?? 0) * 2 },
  //   { key: 'title', label: '名稱', type: 'text', value: row => row.$child_parent[0]?.name ?? '(空)' },
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
