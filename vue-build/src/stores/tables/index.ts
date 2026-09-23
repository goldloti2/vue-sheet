import type { PendingOp, TableQueue } from './queue'
import type { TableKey } from '@/schema'
import { defineStore } from 'pinia'
import { computed, reactive, shallowReactive, shallowRef } from 'vue'
import { schemas } from '@/schema'
import { cascadeRelations, childRelations } from '@/schema/relations'
import { serializeRow } from '@/schema/types'
import { validateRow } from '@/schema/validation'
import { fetchTable } from '@/services/appScript'
import { createQueue } from './queue'
import { createRowGetters } from './rowGetters'

const pendingLoads = new Map<TableKey, Promise<void>>()

interface HasId {
  id: string
}

// 流程存檔點：每張被碰到的表在改動前留一份原值（快取＋佇列），見 README 4.2
interface FlowSnapshot {
  rows: Map<TableKey, unknown[] | undefined>
  queue: Map<TableKey, TableQueue>
}

export const useTablesStore = defineStore('tables', () => {
  // 畫面的單一真相。已送出的與還沒送出的混在一起，畫面不需要分辨
  const rows = shallowReactive<Partial<Record<TableKey, unknown[]>>>({})
  const loading = reactive<Partial<Record<TableKey, boolean>>>({})
  const error = reactive<Partial<Record<TableKey, string | null>>>({})
  const activeFlow = shallowRef<FlowSnapshot | null>(null)
  // 有幾張表單正開著。不為零就不能同步，重抓會把改到一半的沖掉
  const syncHolds = shallowRef(0)

  // 「要送什麼」的單一真相，與 row 上的 getter
  const queue = createQueue()
  const { attachGetters } = createRowGetters(rows)

  const canSync = computed(() => activeFlow.value === null && syncHolds.value === 0)

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
        rows[table] = (await fetchTable<HasId>(table)).map(row => attachGetters(table, row))
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

  // 這張表要用就得一起載的其他表：ref 指到的父表（$欄位key）與指向它的子表（$子表_欄位key、連帶刪除）
  function tablesNeededBy (table: TableKey): TableKey[] {
    const parents = schemas[table].columns.flatMap(column => column.type === 'ref' ? [column.refTable as TableKey] : [])
    const children = childRelations(table).map(relation => relation.childTable)
    return [...new Set([...parents, ...children])]
  }

  // 關聯的表一起載，getter 才有東西讀、連帶刪除才找得到子列。seen 擋住父子互相需要的循環
  async function ensureLoaded (table: TableKey, seen = new Set<TableKey>()) {
    if (seen.has(table)) {
      return
    }
    seen.add(table)

    await Promise.all([
      table in rows ? Promise.resolve() : load(table),
      ...tablesNeededBy(table).map(other => ensureLoaded(other, seen)),
    ])
  }

  // 表單頁活著的期間持有一個，離開時釋放
  function holdSync (): () => void {
    syncHolds.value++
    let released = false
    return () => {
      if (!released) {
        released = true
        syncHolds.value--
      }
    }
  }

  // 推送 + 重抓所有已載入的表；推不出去就不重抓，否則會蓋掉未推送的變更
  async function refresh (): Promise<boolean> {
    if (!canSync.value || !await flush()) {
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
      flow.queue.set(table, queue.snapshot(table))
    }
  }

  function patch (table: TableKey, update: (list: unknown[]) => unknown[]) {
    remember(table)

    const current = rows[table]
    if (current) {
      rows[table] = update(current)
    }
  }

  // 佇列自己不管流程，進東西前先讓流程存檔
  function enqueue (table: TableKey, id: string, kind: PendingOp['kind'], values: Record<string, string>) {
    remember(table)
    queue.enqueue(table, id, kind, values)
  }

  async function flush (): Promise<boolean> {
    if (activeFlow.value) {
      // 流程還沒跑完，推出去的會是半成品，而且推出去之後就回滾不了了
      queue.fail('流程進行中，無法推送')
      return false
    }

    return queue.flush()
  }

  // 開存檔點。一次只能一個：套疊會蓋掉外層的存檔點，所以直接拒絕（見 README 4.4）
  function beginFlow (): void {
    if (activeFlow.value) {
      throw new Error('上一個流程還沒結束')
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
      queue.restore(table, saved)
    }

    activeFlow.value = null
  }

  // 寫入前再驗一次（form 層已經逐欄提示過，這裡擋的是繞過表單的程式 bug）。有錯就拋，什麼都不動
  function assertValid (table: TableKey, values: Record<string, unknown>, keys?: readonly string[]): void {
    const errors = validateRow(values, schemas[table], keys)
    const messages = Object.values(errors)
    if (messages.length > 0) {
      throw new Error(messages.join('、'))
    }
  }

  function create<Row extends HasId> (table: TableKey, values: Record<string, unknown>): Row {
    assertValid(table, values)

    const schema = schemas[table]
    const created = attachGetters(table, { id: schema.newId(), ...values } as Row)

    patch(table, list => [...list, created])
    enqueue(table, created.id, 'create', serializeRow(values, schema))

    return created
  }

  function update<Row extends HasId> (table: TableKey, id: string, values: Record<string, unknown>): Row {
    // values 可以只給幾欄：只驗給了的，但用合併後的整列驗，跨欄位的 validate 才看得到其他欄
    const existing = (rows[table] ?? []).find(row => (row as HasId).id === id) as Record<string, unknown> | undefined
    assertValid(table, { ...existing, ...values }, Object.keys(values))

    const schema = schemas[table]
    let updated = { id, ...values } as Row

    patch(table, list => list.map(row => {
      if ((row as Row).id !== id) {
        return row
      }
      updated = attachGetters(table, { ...(row as Row), ...values, id } as Row)
      return updated
    }))
    enqueue(table, id, 'update', serializeRow(values, schema))

    return updated
  }

  function remove (table: TableKey, id: string): void {
    removeMany(table, [id])
  }

  // 刪完之後順著標了 cascade 的關聯把指向這些列的子列也刪掉，多層遞迴；
  // 走同一條 patch + enqueue，佇列合併與流程存檔點都自動涵蓋。子表沒載就找不到子列，所以 ensureLoaded 會把它們一起載
  function removeMany (table: TableKey, ids: Iterable<string>): void {
    const targets = new Set(ids)
    if (targets.size === 0) {
      return
    }

    // 先確認子表都在，免得刪到一半才發現
    const cascades = cascadeRelations(table)
    for (const relation of cascades) {
      if (!rows[relation.childTable]) {
        throw new Error(`子表 "${relation.childTable}" 尚未載入，無法連帶刪除`)
      }
    }

    patch(table, list => list.filter(row => !targets.has((row as HasId).id)))
    for (const id of targets) {
      enqueue(table, id, 'delete', {})
    }

    for (const relation of cascades) {
      removeMany(relation.childTable, (rows[relation.childTable] ?? [])
        .filter(row => targets.has((row as Record<string, unknown>)[relation.column] as string))
        .map(row => (row as HasId).id))
    }
  }

  return {
    rows,
    loading,
    error,
    hasPending: queue.hasPending,
    flushing: queue.flushing,
    flushError: queue.flushError,
    canSync,
    holdSync,
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
