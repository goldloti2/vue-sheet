import type { TableKey } from '@/schema'
import type { VirtualColumnContext } from '@/schema/types'
import { schemas } from '@/schema'
import { formatField } from '@/schema/types'
import { useRelatedRows } from './useRelatedRows'

// 取一列某欄的顯示文字，真實欄位與虛擬欄位都走這裡。要在 template 或 computed 裡呼叫才會跟著資料更新
export function useRowFields (table: TableKey) {
  const schema = schemas[table]
  const virtual = new Map((schema.virtualColumns ?? []).map(column => [column.key, column]))

  // 只載虛擬欄位用 needs 宣告過的子表
  const needed = new Set((schema.virtualColumns ?? []).flatMap(column => column.needs ?? []) as TableKey[])
  const children = new Map([...needed].map(child => [child, useRelatedRows(child, table)] as const))

  function contextFor (row: object): VirtualColumnContext {
    const id = (row as { id: string }).id
    function related<Child> (childTable: string): Child[] {
      return (children.get(childTable as TableKey)?.relatedTo(id) ?? []) as Child[]
    }
    return { related }
  }

  function field (row: object, key: string): string {
    const column = virtual.get(key)
    return column ? column.value(row, contextFor(row)) : formatField(row, schema, key)
  }

  return { field }
}
