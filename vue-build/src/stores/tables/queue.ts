import type { TableKey } from '@/schema'
import type { BatchOperation } from '@/services/appScript'
import { computed, reactive, shallowRef } from 'vue'
import { ConflictError, mutateBatch } from '@/services/appScript'

export interface PendingOp {
  kind: 'create' | 'update' | 'delete'
  values: Record<string, string>
}

// 一張表尚未推送的操作：id → 操作
export type TableQueue = Map<string, PendingOp>

// 待推送內容的單一資料來源與推送狀態。流程存檔點由呼叫端以 snapshot、restore 處理
export function createQueue () {
  const pending = reactive(new Map<TableKey, TableQueue>())
  const flushing = shallowRef(false)
  const flushError = shallowRef<string | null>(null)
  // 上次自後端取得的檔案修改時間，推送時作為 since 比對
  const knownModifiedTime = shallowRef<string | null>(null)
  // 發生衝突（Sheet 已被別處修改）。佇列保留，等待使用者選擇處理方式
  const conflict = shallowRef(false)
  // 進行中的推送，只供 flush 去除重複呼叫（畫面讀取 flushing）
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

  // 同一列的多次操作於寫入時合併，規則見 docs/topics/store.md
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

  // 此列尚未推送的操作種類，沒有時為 undefined
  function kindOf (table: TableKey, id: string): PendingOp['kind'] | undefined {
    return pending.get(table)?.get(id)?.kind
  }

  // 將整個佇列攤平為操作清單，順序依加入的先後（Map 保序）。所有表共用一個請求
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

  // 推送中再次呼叫時共用同一個 promise。force 為強制推送：不帶 since，只覆蓋修改過的欄位
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

  // 以一個請求送出整批，成功時才清空佇列。失敗時不拋出，錯誤記於 flushError，衝突時另設 conflict
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

  // 推送前即確定無法推送時（例如流程進行中），將原因記於 flushError
  function fail (message: string): void {
    flushError.value = message
  }

  // 供流程存檔點使用：保留目前的佇列，之後原樣還原
  function snapshot (table: TableKey): TableQueue {
    return new Map(queueFor(table))
  }

  function restore (table: TableKey, saved: TableQueue): void {
    pending.set(table, saved)
  }

  // 供「放棄未推送的變更」使用：清空佇列，由呼叫端重新抓取
  function discard (): void {
    pending.clear()
    conflict.value = false
    flushError.value = null
  }

  return { hasPending, flushing, flushError, conflict, knownModifiedTime, enqueue, kindOf, flush, fail, discard, snapshot, restore }
}
