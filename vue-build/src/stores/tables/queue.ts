import type { TableKey } from '@/schema'
import type { BatchOperation } from '@/services/appScript'
import { computed, reactive, shallowRef } from 'vue'
import { schemas } from '@/schema'
import { serializeRow } from '@/schema/types'
import { ConflictError, mutateBatch } from '@/services/appScript'

// values 以欄位的 key 為鍵，值為轉型後的值。推送時才以 serializeRow 轉為 Sheet 的字串
export interface PendingOp {
  kind: 'create' | 'update' | 'delete'
  values: Record<string, unknown>
}

// 一張表尚未推送的操作：id → 操作
export type TableQueue = Map<string, PendingOp>

// 待推送內容的單一資料來源與推送狀態。流程存檔點由呼叫端以 snapshot、restore 處理
export function createQueue () {
  const pending = reactive(new Map<TableKey, TableQueue>())
  // 送出中或上次未寫入的一批。推送期間的修改另存於 pending，下一次推送開始時才併入
  const sending = reactive(new Map<TableKey, TableQueue>())
  const flushing = shallowRef(false)
  const flushError = shallowRef<string | null>(null)
  // 上次自後端取得的檔案修改時間，推送時作為 since 比對
  const knownModifiedTime = shallowRef<string | null>(null)
  // 發生衝突（Sheet 已被別處修改）。佇列保留，等待使用者選擇處理方式
  const conflict = shallowRef(false)
  // 加入操作的次數，供計時推送判斷最後一次修改
  const edits = shallowRef(0)
  // 進行中的推送，只供 flush 去除重複呼叫（畫面讀取 flushing）
  let flushPromise: Promise<boolean> | null = null

  const hasPending = computed(() => {
    for (const queue of [...pending.values(), ...sending.values()]) {
      if (queue.size > 0) {
        return true
      }
    }
    return false
  })

  function queueFor (queues: Map<TableKey, TableQueue>, table: TableKey): TableQueue {
    const existing = queues.get(table)
    if (existing) {
      return existing
    }

    const created: TableQueue = new Map()
    queues.set(table, created)
    return created
  }

  // 同一列的多次操作於寫入時合併，規則見 docs/topics/store.md
  function merge (queue: TableQueue, id: string, kind: PendingOp['kind'], values: Record<string, unknown>) {
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

  // 只保留 schema 中真實欄位的值
  function enqueue (table: TableKey, id: string, kind: PendingOp['kind'], values: Record<string, unknown>) {
    edits.value++
    const columns = schemas[table].columns.filter(column => column.key in values)
    merge(queueFor(pending, table), id, kind, Object.fromEntries(columns.map(column => [column.key, values[column.key]])))
  }

  // 此列尚未推送的操作種類，沒有時為 undefined。推送期間的修改優先
  function kindOf (table: TableKey, id: string): PendingOp['kind'] | undefined {
    return pending.get(table)?.get(id)?.kind ?? sending.get(table)?.get(id)?.kind
  }

  // 一張表尚未推送的操作，sending 在前、pending 在後，各自依加入的先後。供重新抓取後蓋回快取
  function opsOf (table: TableKey): [string, PendingOp][] {
    return [...sending.get(table) ?? [], ...pending.get(table) ?? []]
  }

  // 將 pending 併入 sending，順序依加入的先後（Map 保序）
  function takePending (): void {
    for (const [table, queue] of pending) {
      const target = queueFor(sending, table)
      for (const [id, op] of queue) {
        merge(target, id, op.kind, op.values)
      }
    }
    pending.clear()
  }

  // 將 sending 攤平為操作清單，值於此序列化。所有表共用一個請求
  function toOperations (): BatchOperation[] {
    const operations: BatchOperation[] = []
    for (const [table, queue] of sending) {
      for (const [id, op] of queue) {
        operations.push(op.kind === 'delete'
          ? { table, kind: 'delete', id }
          : { table, kind: op.kind, id, values: serializeRow(op.values, schemas[table]) })
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

  // 以一個請求送出整批，成功時才清空 sending。失敗時不拋出，錯誤記於 flushError，衝突時另設 conflict
  async function sendQueue (force: boolean): Promise<boolean> {
    flushing.value = true
    flushError.value = null
    conflict.value = false
    takePending()

    try {
      const operations = toOperations()
      if (operations.length > 0) {
        knownModifiedTime.value = await mutateBatch(operations, force ? undefined : knownModifiedTime.value ?? undefined)
        sending.clear()
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

  // 供流程存檔點使用：保留目前的 pending，之後原樣還原。流程進行中不推送，sending 不受流程影響
  function snapshot (table: TableKey): TableQueue {
    return new Map(queueFor(pending, table))
  }

  function restore (table: TableKey, saved: TableQueue): void {
    pending.set(table, saved)
  }

  // 供「放棄未推送的變更」使用：清空佇列，由呼叫端重新抓取
  function discard (): void {
    pending.clear()
    sending.clear()
    conflict.value = false
    flushError.value = null
  }

  return { hasPending, flushing, flushError, conflict, edits, knownModifiedTime, enqueue, kindOf, opsOf, flush, fail, discard, snapshot, restore }
}
