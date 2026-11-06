import type { TableKey } from '@/schema'
import type { RowBase, TableSchema } from '@/schema/types'
import { prefixedId } from '@/schema/types'

// 測試用的三張表，以 vi.mock 取代 @/schema。父表 ← 子表 ← 附註，關聯的設定與一般專案相同

export interface ParentRow extends RowBase {
  code: string | null
  status: string | null
  source: string | null
  method: string | null
  fee: number | null
  startDate: Date | null
  endDate: Date | null
  note: string | null
  readonly $children_parent: ChildRow[]
  readonly title: string
  readonly total: number | null
}

export interface ChildRow extends RowBase {
  code: string | null
  parent: string | null
  name: string | null
  amount: number | null
  fee: number | null
  day: Date | null
  note: string | null
  readonly $parent?: ParentRow
  readonly $notes_child: NoteRow[]
  readonly $notes_related: NoteRow[]
  readonly total: number | null
  readonly status: string | null
}

export interface NoteRow extends RowBase {
  code: string | null
  child: string | null
  related: string | null
  content: string | null
  readonly $child?: ChildRow
  readonly $related?: ChildRow
  readonly parent: string | null
}

const parents: TableSchema<ParentRow> = {
  tableLabel: '父表',
  idColumn: 'code',
  labelColumn: 'title',
  newId: prefixedId('P'),
  columns: [
    { key: 'code', label: 'P-ID', type: 'text' },
    { key: 'status', label: '狀態', type: 'select', options: ['未開始', '進行中', '暫停', '已完成'], required: true },
    { key: 'source', label: '來源', type: 'select', options: ['來源甲', '來源乙'], allowCustom: true },
    { key: 'method', label: '方式', type: 'text' },
    { key: 'fee', label: '費用', type: 'number' },
    { key: 'startDate', label: '開始日期', type: 'date' },
    { key: 'endDate', label: '結束日期', type: 'date' },
    { key: 'note', label: '備註', type: 'text' },
  ],
  virtualColumns: [
    { key: 'title', label: '名稱', type: 'text', value: row => row.$children_parent[0]?.$label ?? '(空白)' },
    { key: 'total', label: '總額', type: 'number', value: row => row.$children_parent.reduce((sum, child) => sum + (child.total ?? 0), row.fee ?? 0) },
  ],
  defaultSort: [{ key: 'status', direction: 'asc' }],
}

const children: TableSchema<ChildRow> = {
  tableLabel: '子表',
  idColumn: 'code',
  labelColumn: 'name',
  newId: prefixedId('C'),
  columns: [
    { key: 'code', label: 'C-ID', type: 'text' },
    { key: 'parent', label: '父列', sheetHeader: 'P-ID', type: 'ref', refTable: 'parents', required: true, onDelete: 'cascade', onEmpty: 'delete' },
    { key: 'name', label: '名稱', type: 'text', required: true },
    { key: 'amount', label: '金額', type: 'number', min: 0 },
    { key: 'fee', label: '費用', type: 'number', validate: (value, row) => row.amount !== null && value > row.amount ? '費用不能大於金額' : null },
    { key: 'day', label: '日期', type: 'date' },
    { key: 'note', label: '備註', type: 'text' },
  ],
  virtualColumns: [
    { key: 'total', label: '小計', type: 'number', value: row => row.amount === null ? null : row.amount + (row.fee ?? 0) },
    { key: 'status', label: '狀態', type: 'select', options: [], value: row => row.$parent?.status ?? null },
  ],
  defaultSort: [{ key: 'day', direction: 'asc' }],
}

// 沒有 newId，主鍵為必填。child 連帶刪除，related 不連帶刪除
const notes: TableSchema<NoteRow> = {
  tableLabel: '附註',
  idColumn: 'code',
  labelColumn: 'content',
  columns: [
    { key: 'code', label: 'N-ID', type: 'text' },
    { key: 'child', label: '子列', sheetHeader: 'C-ID', type: 'ref', refTable: 'children', onDelete: 'cascade' },
    { key: 'related', label: '關聯', type: 'ref', refTable: 'children' },
    { key: 'content', label: '內容', type: 'text', required: true },
  ],
  virtualColumns: [
    { key: 'parent', label: '父列', type: 'ref', refTable: 'parents', value: row => row.$child?.parent ?? null },
  ],
}

export const schemas = { parents, children, notes }

// 測試中的表名。TableKey 來自 src/schema，不含測試的表，因此於此轉型
export const PARENTS = 'parents' as string as TableKey
export const CHILDREN = 'children' as string as TableKey
export const NOTES = 'notes' as string as TableKey
