import type { TableKey } from '@/schema'
import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { fetchTable, mutateTable } from '@/services/appScript'

const pendingLoads = new Map<TableKey, Promise<void>>()

interface HasId {
  id: string
}

export const useTablesStore = defineStore('tables', () => {
  const rows = reactive<Partial<Record<TableKey, unknown[]>>>({})
  const loading = reactive<Partial<Record<TableKey, boolean>>>({})
  const error = reactive<Partial<Record<TableKey, string | null>>>({})

  async function load (table: TableKey) {
    const existing = pendingLoads.get(table)
    if (existing) {
      await existing
      return
    }

    const promise = (async () => {
      loading[table] = true
      error[table] = null
      try {
        rows[table] = await fetchTable<unknown>(table)
      } catch (loadError) {
        error[table] = loadError instanceof Error ? loadError.message : String(loadError)
      } finally {
        loading[table] = false
      }
    })()

    pendingLoads.set(table, promise)
    try {
      await promise
    } finally {
      pendingLoads.delete(table)
    }
  }

  async function ensureLoaded (table: TableKey) {
    if (table in rows) {
      return
    }
    await load(table)
  }

  async function refresh (table: TableKey) {
    await load(table)
  }

  function patch (table: TableKey, update: (list: unknown[]) => unknown[]) {
    const current = rows[table]
    if (current) {
      rows[table] = update(current)
    }
  }

  async function create<Row extends HasId> (table: TableKey, values: Record<string, unknown>): Promise<Row> {
    const created = await mutateTable<Row>('create', table, values)
    patch(table, list => [...list, created])
    return created
  }

  async function update<Row extends HasId> (table: TableKey, id: string, values: Record<string, unknown>): Promise<Row> {
    const updated = await mutateTable<Row>('update', table, { id, ...values })
    patch(table, list => list.map(row => (row as Row).id === id ? updated : row))
    return updated
  }

  // beforePatch：後端刪除成功、但快取還沒更新前要先做的事。detail 頁刪除自己這一筆時用它先離開頁面，
  // 否則 row 會在返回動畫播完前就變 null，畫面先閃一下「找不到這筆資料」。
  // 不管 beforePatch 成不成功，快取一定要移除——後端那筆已經沒了
  async function remove (table: TableKey, id: string, beforePatch?: () => Promise<void>): Promise<void> {
    await mutateTable('delete', table, { id })
    try {
      await beforePatch?.()
    } finally {
      patch(table, list => list.filter(row => (row as HasId).id !== id))
    }
  }

  async function removeMany (table: TableKey, ids: Iterable<string>): Promise<void> {
    const targets = new Set(ids)
    await Promise.all([...targets].map(id => mutateTable('delete', table, { id })))
    patch(table, list => list.filter(row => !targets.has((row as HasId).id)))
  }

  return { rows, loading, error, ensureLoaded, refresh, create, update, remove, removeMany }
})
