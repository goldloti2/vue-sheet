import type { TableKey } from '@/schema'
import { computed, reactive, shallowRef } from 'vue'
import { mutateTable } from '@/services/appScript'

export interface PendingOp {
  kind: 'create' | 'update' | 'delete'
  values: Record<string, string>
}

// 一張表還沒推送的操作：id → 操作
export type TableQueue = Map<string, PendingOp>

// 「要送什麼」的單一真相，加上推送的狀態。流程存檔點的事由呼叫端管（snapshot / restore）
export function createQueue () {
  const pending = reactive(new Map<TableKey, TableQueue>())
  const flushing = shallowRef(false)
  const flushError = shallowRef<string | null>(null)
  // 進行中的那一次推送，只給 flush 自己做去重用（畫面看 flushing）
  let flushPromise: Promise<boolean> | null = null

  const hasPending = computed(() => {
    for (const queue of pending.values()) {
      if (queue.size > 0) {
        return true
      }
    }
    return false
  })

  function queueFor (table: TableKey): TableQueue {
    const existing = pending.get(table)
    if (existing) {
      return existing
    }

    const created: TableQueue = new Map()
    pending.set(table, created)
    return created
  }

  // 同一筆的多次操作在寫入當下就合併，規則見 README 4.2
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

  // 推送中又有人叫就共用同一個 promise，等到的是真正的結果（跟 load 的 pendingLoads 同一套）
  async function flush (): Promise<boolean> {
    if (flushPromise) {
      return flushPromise
    }

    flushPromise = sendQueue()
    try {
      return await flushPromise
    } finally {
      flushPromise = null
    }
  }

  // 逐筆送出，成功一筆移掉一筆；失敗不還原、不往外拋，錯誤記在 flushError
  async function sendQueue (): Promise<boolean> {
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

  // 還沒開始推就知道推不了（例如流程進行中），理由寫進同一個地方
  function fail (message: string): void {
    flushError.value = message
  }

  // 流程存檔點用：留一份現在的佇列、之後原樣放回去
  function snapshot (table: TableKey): TableQueue {
    return new Map(queueFor(table))
  }

  function restore (table: TableKey, saved: TableQueue): void {
    pending.set(table, saved)
  }

  return { hasPending, flushing, flushError, enqueue, flush, fail, snapshot, restore }
}
