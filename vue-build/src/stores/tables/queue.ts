import type { TableKey } from '@/schema'
import type { BatchOperation } from '@/services/appScript'
import { computed, reactive, shallowRef } from 'vue'
import { ConflictError, mutateBatch } from '@/services/appScript'

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
  // 上次從後端看到的檔案修改時間，推送時當 since 送出去比對
  const knownModifiedTime = shallowRef<string | null>(null)
  // 真的撞到衝突（Sheet 被別處改過）。佇列留著，等使用者選一條出路
  const conflict = shallowRef(false)
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

  // 同一筆的多次操作在寫入當下就合併，規則見 docs/store.md
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

  // 整個佇列攤平成一串操作，順序照加入的先後（Map 保序）。跨表共用一個請求
  function toOperations (): BatchOperation[] {
    const operations: BatchOperation[] = []
    for (const [table, queue] of pending) {
      for (const [id, op] of queue) {
        operations.push(op.kind === 'delete'
          ? { table, kind: 'delete', id }
          : { table, kind: op.kind, id, values: op.values })
      }
    }
    return operations
  }

  // 推送中又有人叫就共用同一個 promise，等到的是真正的結果（跟 load 的 pendingLoads 同一套）
  // force 是「強制推送」：不帶 since，不管 Sheet 被改過也照寫（只蓋掉改過的那幾欄）
  async function flush (force = false): Promise<boolean> {
    if (flushPromise) {
      return flushPromise
    }

    flushPromise = sendQueue(force)
    try {
      return await flushPromise
    } finally {
      flushPromise = null
    }
  }

  // 一個請求送出整批，全有全無：成功才清空佇列，失敗原封不動留著讓使用者重按
  // 失敗不往外拋，錯誤記在 flushError；撞到衝突另外立起 conflict，由呼叫端問使用者要走哪條路
  async function sendQueue (force: boolean): Promise<boolean> {
    flushing.value = true
    flushError.value = null
    conflict.value = false

    try {
      const operations = toOperations()
      if (operations.length > 0) {
        knownModifiedTime.value = await mutateBatch(operations, force ? undefined : knownModifiedTime.value ?? undefined)
        pending.clear()
      }
      return true
    } catch (error) {
      conflict.value = error instanceof ConflictError
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

  // 「放棄未推送的變更」用：整個佇列丟掉，由呼叫端接著重抓
  function discard (): void {
    pending.clear()
    conflict.value = false
    flushError.value = null
  }

  return { hasPending, flushing, flushError, conflict, knownModifiedTime, enqueue, flush, fail, discard, snapshot, restore }
}
