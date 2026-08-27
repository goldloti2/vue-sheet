import type { TableSchema } from './types'

export interface TemplateRow {
  id: string
  status: string | null
  number: number | null
  date: Date | null
}

export const templateSchema: TableSchema = {
  sheetName: 'template',
  idColumn: 'UUID',
  columns: [
    { key: 'status', label: '狀態', type: 'text' },
    { key: 'number', label: 'num', type: 'number' },
    { key: 'date', label: 'Date', type: 'date' },
  ],
  defaultSort: [
    { key: 'date', direction: 'asc' },
    { key: 'number', direction: 'asc' },
  ],
  detailOrder: [
    'date',
    'number',
    'status',
  ],
}
