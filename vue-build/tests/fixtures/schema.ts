import type { TableSchema } from '@/schema/types'

// 測試共用的表：每種型別各一欄，不使用 src/schema/tables 中的表
export const sampleSchema: TableSchema = {
  tableLabel: '測試',
  idColumn: 'code',
  labelColumn: 'name',
  columns: [
    { key: 'code', label: '編號', type: 'text' },
    { key: 'name', label: '名稱', type: 'text', required: true },
    { key: 'price', label: '價格', sheetHeader: 'PRICE', type: 'number', min: 0, max: 100 },
    { key: 'level', label: '等級', type: 'number' },
    { key: 'day', label: '日期', type: 'date' },
    { key: 'done', label: '完成', type: 'boolean' },
    { key: 'time', label: '時長', type: 'duration' },
    { key: 'status', label: '狀態', type: 'select', options: ['高', '中', '低'] },
    { key: 'tag', label: '標籤', type: 'select', options: ['A', 'B'], allowCustom: true },
    { key: 'parent', label: '上層', type: 'ref', refTable: 'parents' },
    { key: 'photo', label: '圖片', type: 'image' },
  ],
  virtualColumns: [
    { key: 'double', label: '兩倍', type: 'number', value: row => row.price === null ? null : row.price * 2 },
  ],
  // level 不列入，用於檢查不在 searchable 中的條件
  searchable: ['name', 'price', 'day', 'done', 'time', 'status', 'tag', 'parent'],
  sortable: ['name', 'price', 'day', 'done', 'time', 'status', 'tag', 'parent', 'photo'],
}
