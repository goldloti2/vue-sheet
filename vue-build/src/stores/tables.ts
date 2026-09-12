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

// 流程存檔點：每張被碰到的表在改動前留一份原值（快取＋佇列），見 README 4.2
interface FlowSnapshot {
  rows: Map<TableKey, unknown[] | undefined>
  queue: Map<TableKey, Map<string, PendingOp>>
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
  const activeFlow = shallowRef<FlowSnapshot | null>(null)

  const inFlow = computed(() => activeFlow.value !== null)

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

  // 推送 + 重抓所有已載入的表；推不出去就不重抓，否則會蓋掉未推送的變更
  async function refresh (): Promise<boolean> {
    if (!await flush()) {
      return false
    }

    await Promise.all(Object.keys(rows).map(table => load(table as TableKey)))
    return true
  }

  // 流程碰到這張表之前先留一份。同一張表只留第一次，之後的改動都算流程的
  function remember (table: TableKey) {
    const flow = activeFlow.value
    if (!flow) {
      return
    }

    if (!flow.rows.has(table)) {
      flow.rows.set(table, rows[table])
    }
    if (!flow.queue.has(table)) {
      flow.queue.set(table, new Map(queueFor(table)))
    }
  }

  function patch (table: TableKey, update: (list: unknown[]) => unknown[]) {
    remember(table)

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

  // 同一筆的多次操作在寫入當下就合併，規則見 README 4.2
  function enqueue (table: TableKey, id: string, kind: PendingOp['kind'], values: Record<string, string>) {
    remember(table)

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

  // 逐筆送出，成功一筆移掉一筆；失敗不還原、不往外拋，錯誤記在 flushError
  async function flush (): Promise<boolean> {
    if (activeFlow.value) {
      // 流程還沒跑完，推出去的會是半成品，而且推出去之後就回滾不了了
      flushError.value = '流程進行中，無法推送'
      return false
    }

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

  // 開存檔點。一次只能一個，連接器要在 finally 裡 commit 或 rollback
  function beginFlow (): void {
    if (import.meta.env.DEV && activeFlow.value) {
      console.warn('[tables] 上一個流程還沒結束就又開了一個，舊的存檔點會被丟掉')
    }

    activeFlow.value = { rows: new Map(), queue: new Map() }
  }

  // 流程完成：丟掉存檔點，變更留在佇列裡等推送
  function commitFlow (): void {
    activeFlow.value = null
  }

  // 流程取消：快取與佇列都還原成流程開始前的樣子，沒碰過的表一個位元都不動
  function rollbackFlow (): void {
    const flow = activeFlow.value
    if (!flow) {
      return
    }

    for (const [table, saved] of flow.rows) {
      if (saved === undefined) {
        delete rows[table]
      } else {
        rows[table] = saved
      }
    }

    for (const [table, saved] of flow.queue) {
      pending.set(table, saved)
    }

    activeFlow.value = null
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
    inFlow,
    ensureLoaded,
    refresh,
    flush,
    beginFlow,
    commitFlow,
    rollbackFlow,
    create,
    update,
    remove,
    removeMany,
  }
})
