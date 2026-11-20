// 複製到 src/schema/tables/__table__.ts
// __source__、__Source__ 為規則的來源表，換成來源表的代稱與 PascalCase 前綴
//
// 虛擬表：唯讀，列由規則從真實表產生，不在 Sheet 上。規則、id 與原始順序見 docs/topics/schema.md 的「虛擬表」。
// 每個設定的說明寫於 src/schema/types.ts 的型別上。
import type { RowBase, VirtualTableSchema } from '../types'
import type { __Source__Row } from './__source__'

// id 與 $label 來自 RowBase。規則欄位照一般的欄位列出，虛擬欄位與 row 上的 getter 以 readonly 列出
export interface __Table__Row extends RowBase {
  source: string | null
  kind: string | null
  amount: number | null
  readonly $source?: __Source__Row
  readonly doubled: number | null
}

export const __table__Schema: VirtualTableSchema<__Table__Row> = {
  // 表於畫面上的名稱（表的 chip、頁籤比對）
  tableLabel: '範本',
  // 稱呼一列所用的欄位，省略時為 id
  labelColumn: 'kind',
  // 規則欄位：值由 rules 填入。順序也是原始順序：依序逐欄升冪比較
  columns: [
    { key: 'kind', label: '種類', type: 'select', options: ['範本'] },
    { key: 'amount', label: '金額', type: 'number', separator: true },
    { key: 'source', label: '來源', type: 'ref', refTable: '__source__' },
  ],
  // 來源列每符合一條規則即產生一列。values 的值為常數，或以來源列為參數的函數，未指定的欄位為 null
  rules: [
    {
      table: '__source__',
      when: source => source.amount !== null,
      values: {
        kind: '範本',
        amount: source => source.amount,
        source: source => source.id,
      },
    },
  ],
  // 各規則都相同的計算，或須讀取這一列其他欄位的計算，寫成虛擬欄位
  virtualColumns: [
    { key: 'doubled', label: '兩倍', type: 'number', value: row => row.amount === null ? null : row.amount * 2 },
  ],
  // 以下皆可省略。沒有表單，因此沒有 formOrder
  searchable: ['kind', 'source'],
  sortable: ['amount'],
  detailOrder: ['kind', 'amount', 'doubled', 'source'],
}
