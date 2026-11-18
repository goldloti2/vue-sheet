import type { SchemaTestContext } from './schema/setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { parseSchema } from '../server/schema/schemaModel'
import { columnChanges } from '../shared/columnChanges'
import { loadSchemaTestContext } from './schema/setup'

let context: SchemaTestContext

beforeAll(async () => {
  context = await loadSchemaTestContext()
}, 30_000)

function changes (edit: (text: string) => string): string[] {
  const after = edit(context.template)
  return columnChanges(parseSchema(context.ts, context.template), context.template, parseSchema(context.ts, after), after)
}

describe('columnChanges', () => {
  it('finds no change when the columns stay the same', () => {
    expect(changes(text => text.replace('tableLabel: \'範本\'', 'tableLabel: \'樣本\''))).toEqual([])
  })

  it('lists added and removed columns', () => {
    expect(changes(text => text
      .replace('    { key: \'date\', label: \'日期\', type: \'date\' },\n', '')
      .replace('  ],\n  // 以下皆可省略', '    { key: \'note\', label: \'備註\', type: \'text\' },\n  ],\n  // 以下皆可省略'))).toEqual(['新增欄位 note', '刪除欄位 date'])
  })

  it('treats a new key at the same place as a rename', () => {
    expect(changes(text => text.replace('{ key: \'date\', label: \'日期\'', '{ key: \'orderedAt\', label: \'下訂日期\''))).toEqual([
      '欄位 date 改為 orderedAt',
      '欄位 orderedAt 的表頭由「日期」改為「下訂日期」',
    ])
  })

  it('lists header and type changes', () => {
    expect(changes(text => text
      .replace('{ key: \'code\', label: \'編號\', sheetHeader: \'TPL-ID\'', '{ key: \'code\', label: \'代碼\', sheetHeader: \'TPL-CODE\'')
      .replace('{ key: \'name\', label: \'名稱\', type: \'text\'', '{ key: \'name\', label: \'名稱\', type: \'select\''))).toEqual([
      '欄位 code 的表頭由「TPL-ID」改為「TPL-CODE」',
      '欄位 name 的型別由 text 改為 select',
    ])
  })

  it('ignores a label change when the column has a Sheet header', () => {
    expect(changes(text => text.replace('label: \'編號\'', 'label: \'代碼\''))).toEqual([])
  })
})
