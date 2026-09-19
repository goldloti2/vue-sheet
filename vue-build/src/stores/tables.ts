import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import { defineStore } from 'pinia'
import { computed, reactive, shallowRef } from 'vue'
import { schemas } from '@/schema'
import { cascadeRelations, getRelation } from '@/schema/relations'
import { rowLabel, serializeRow, sortRows } from '@/schema/types'
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
  // 有幾張表單正開著。不為零就不能同步，重抓會把改到一半的沖掉
  const syncHolds = shallowRef(0)

  const canSync = computed(() => activeFlow.value === null && syncHolds.value === 0)

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

  // 這張表要用就得一起載的其他表：ref 指到的父表、虛擬欄位 needs 的表、刪除時要連帶刪的子表
  function tablesNeededBy (table: TableKey): TableKey[] {
    const schema = schemas[table]
    const parents = schema.columns.flatMap(column => column.type === 'ref' ? [column.refTable] : [])
    const needs = (schema.virtualColumns ?? []).flatMap(column => column.needs ?? [])
    const cascades = cascadeRelations(table).map(relation => relation.childTable)
    return [...new Set([...parents, ...needs, ...cascades])] as TableKey[]
  }

  // 相關的表一起載，getter 才有東西讀、連帶刪除才找得到子列。seen 擋住父子互相需要的循環
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

  // 指向這一列的子表資料，照子表的 defaultSort 排。子表還沒載就是空的，載進來後讀它的地方會自己重算
  function relatedRows (parentTable: TableKey, childTable: TableKey, parentId: string): unknown[] {
    const { column } = getRelation(childTable, parentTable)
    const matching = (rows[childTable] ?? []).filter(row => (row as Record<string, unknown>)[column] === parentId)
    return sortRows(matching, schemas[childTable])
  }

  function defineGetter (row: object, key: string, get: () => unknown): void {
    Object.defineProperty(row, key, { configurable: true, get })
  }

  // 掛在 row 上、讀起來跟真實欄位一樣的 getter（不可列舉，spread / JSON / Object.keys 都看不到）：
  // 虛擬欄位、$label（這一列的名字）、每個 ref 欄位的 $欄位key（父表那一列）
  function attachGetters<Row extends HasId> (table: TableKey, row: Row): Row {
    // 用不帶 Row 的 TableSchema 接，否則 schemas[table] 是各表 schema 的 union，value 的參數會變成所有 Row 的交集
    const schema: TableSchema = schemas[table]

    for (const column of schema.virtualColumns ?? []) {
      defineGetter(row, column.key, () => column.value(row, {
        related: <Child>(childTable: string) => relatedRows(table, childTable as TableKey, row.id) as Child[],
      }))
    }

    defineGetter(row, '$label', () => rowLabel(row, schema))

    for (const column of schema.columns) {
      if (column.type === 'ref') {
        const parentTable = column.refTable as TableKey
        defineGetter(row, `$${column.key}`, () => {
          const id = (row as Record<string, unknown>)[column.key]
          return (rows[parentTable] ?? []).find(candidate => (candidate as HasId).id === id)
        })
      }
    }

    return row
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
      pending.set(table, saved)
    }

    activeFlow.value = null
  }

  function create<Row extends HasId> (table: TableKey, values: Record<string, unknown>): Row {
    const schema = schemas[table]
    const created = attachGetters(table, { id: schema.newId(), ...values } as Row)

    patch(table, list => [...list, created])
    enqueue(table, created.id, 'create', serializeRow(values, schema))

    return created
  }

  function update<Row extends HasId> (table: TableKey, id: string, values: Record<string, unknown>): Row {
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
    hasPending,
    flushing,
    flushError,
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
