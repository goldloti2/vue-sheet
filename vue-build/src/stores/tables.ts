import type { TableKey } from '@/schema'
import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { schemas } from '@/schema'
import { serializeRow } from '@/schema/types'
import { fetchTable, mutateTable } from '@/services/appScript'

const pendingLoads = new Map<TableKey, Promise<void>>()

interface HasId {
  id: string
}

interface PendingOp {
  kind: 'create' | 'update' | 'delete'
  values: Record<string, string>
}

export const useTablesStore = defineStore('tables', () => {
  // 畫面的單一真相。已送出的與還沒送出的混在一起，畫面不需要分辨
  const rows = reactive<Partial<Record<TableKey, unknown[]>>>({})
  const loading = reactive<Partial<Record<TableKey, boolean>>>({})
  const error = reactive<Partial<Record<TableKey, string | null>>>({})
  // 「要送什麼」的單一真相
  const pending = reactive(new Map<TableKey, Map<string, PendingOp>>())

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

  // 重抓整表會蓋掉還沒送出去的東西，所以一定要先清空佇列
  async function refresh (table: TableKey) {
    try {
      await flush()
    } catch (flushError) {
      error[table] = flushError instanceof Error ? flushError.message : String(flushError)
      return
    }

    await load(table)
  }

  function patch (table: TableKey, update: (list: unknown[]) => unknown[]) {
    const current = rows[table]
    if (current) {
      rows[table] = update(current)
    }
  }

  function queueFor (table: TableKey): Map<string, PendingOp> {
    const existing = pending.get(table)
    if (existing) {
      return existing
    }

    const created = new Map<string, PendingOp>()
    pending.set(table, created)
    return created
  }

  /**
   * 一次寫入疊進佇列。
   * update + update 併成一次、create + update 併進 create、
   * create + delete 整組移除、update + delete 只留 delete。
   */
  function enqueue (table: TableKey, id: string, kind: PendingOp['kind'], values: Record<string, string>) {
    const queue = queueFor(table)
    const existing = queue.get(id)

    if (kind === 'delete') {
      if (existing?.kind === 'create') {
        queue.delete(id)
      } else {
        queue.set(id, { kind: 'delete', values: {} })
      }
      return
    }

    queue.set(id, {
      kind: existing?.kind === 'create' ? 'create' : kind,
      values: { ...existing?.values, ...values },
    })
  }

  async function send (table: TableKey, id: string, op: PendingOp): Promise<void> {
    await (op.kind === 'delete'
      ? mutateTable('delete', table, { id })
      : mutateTable(op.kind, table, { id, ...op.values }))
  }

  async function flush (): Promise<void> {
    for (const [table, queue] of pending) {
      for (const [id, op] of queue) {
        await send(table, id, op)
        queue.delete(id)
      }
    }
  }

  /**
   * 快取先行：先改畫面、進佇列，再送出去。失敗就把快取與佇列一起還原成動之前的樣子，
   * 對外行為跟「先送後端、成功才改快取」一致。
   *
   * 這裡的 `await flush()` 是暫時的——之後改成由使用者按推送鈕觸發，那時失敗不再還原，
   * 而是保持「未推送」狀態讓他重按（見 ROADMAP 累積寫入）。
   */
  async function commit (table: TableKey, apply: () => void): Promise<void> {
    const savedRows = rows[table]
    const savedQueue = new Map(queueFor(table))

    apply()

    try {
      await flush()
    } catch (flushError) {
      rows[table] = savedRows
      pending.set(table, savedQueue)
      throw flushError
    }
  }

  async function create<Row extends HasId> (table: TableKey, values: Record<string, unknown>): Promise<Row> {
    const schema = schemas[table]
    const created = { id: schema.newId(), ...values } as Row

    await commit(table, () => {
      patch(table, list => [...list, created])
      enqueue(table, created.id, 'create', serializeRow(values, schema))
    })

    return created
  }

  async function update<Row extends HasId> (table: TableKey, id: string, values: Record<string, unknown>): Promise<Row> {
    const schema = schemas[table]
    const updated = { id, ...values } as Row

    await commit(table, () => {
      patch(table, list => list.map(row => (row as Row).id === id ? updated : row))
      enqueue(table, id, 'update', serializeRow(values, schema))
    })

    return updated
  }

  async function remove (table: TableKey, id: string): Promise<void> {
    await commit(table, () => {
      patch(table, list => list.filter(row => (row as HasId).id !== id))
      enqueue(table, id, 'delete', {})
    })
  }

  async function removeMany (table: TableKey, ids: Iterable<string>): Promise<void> {
    const targets = new Set(ids)

    await commit(table, () => {
      patch(table, list => list.filter(row => !targets.has((row as HasId).id)))
      for (const id of targets) {
        enqueue(table, id, 'delete', {})
      }
    })
  }

  return { rows, loading, error, ensureLoaded, refresh, flush, create, update, remove, removeMany }
})
