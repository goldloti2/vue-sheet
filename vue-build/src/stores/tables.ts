import type { TableKey } from '@/schema'
import { defineStore } from 'pinia'
import { computed, reactive, shallowRef } from 'vue'
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
  const flushing = shallowRef(false)
  const flushError = shallowRef<string | null>(null)

  const hasPending = computed(() => {
    for (const queue of pending.values()) {
      if (queue.size > 0) {
        return true
      }
    }
    return false
  })

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

  /**
   * 推送 + 重抓所有已載入的表。重抓會蓋掉還沒送出去的東西，所以推不出去就不重抓。
   * 回傳有沒有真的重抓（＝佇列清空了沒）。
   */
  async function refresh (): Promise<boolean> {
    if (!await flush()) {
      return false
    }

    await Promise.all(Object.keys(rows).map(table => load(table as TableKey)))
    return true
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

  /**
   * 把佇列送出去。送成功一筆就從佇列移掉，所以失敗時已經送出的不會重送，
   * 剩下的留在佇列裡等使用者再按一次推送。
   *
   * 不會往外拋，錯誤記在 `flushError`。回傳佇列是不是已經清空。
   */
  async function flush (): Promise<boolean> {
    if (flushing.value) {
      return !hasPending.value
    }

    flushing.value = true
    flushError.value = null

    try {
      for (const [table, queue] of pending) {
        for (const [id, op] of queue) {
          await send(table, id, op)
          queue.delete(id)
        }
      }
      return true
    } catch (error) {
      flushError.value = error instanceof Error ? error.message : String(error)
      return false
    } finally {
      flushing.value = false
    }
  }

  function create<Row extends HasId> (table: TableKey, values: Record<string, unknown>): Row {
    const schema = schemas[table]
    const created = { id: schema.newId(), ...values } as Row

    patch(table, list => [...list, created])
    enqueue(table, created.id, 'create', serializeRow(values, schema))

    return created
  }

  function update<Row extends HasId> (table: TableKey, id: string, values: Record<string, unknown>): Row {
    const schema = schemas[table]
    const updated = { id, ...values } as Row

    patch(table, list => list.map(row => (row as Row).id === id ? updated : row))
    enqueue(table, id, 'update', serializeRow(values, schema))

    return updated
  }

  function remove (table: TableKey, id: string): void {
    patch(table, list => list.filter(row => (row as HasId).id !== id))
    enqueue(table, id, 'delete', {})
  }

  function removeMany (table: TableKey, ids: Iterable<string>): void {
    const targets = new Set(ids)

    patch(table, list => list.filter(row => !targets.has((row as HasId).id)))
    for (const id of targets) {
      enqueue(table, id, 'delete', {})
    }
  }

  return {
    rows,
    loading,
    error,
    hasPending,
    flushing,
    flushError,
    ensureLoaded,
    refresh,
    flush,
    create,
    update,
    remove,
    removeMany,
  }
})
