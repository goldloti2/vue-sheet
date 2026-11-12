import type { PendingOp, TableQueue } from './queue'
import type { TableKey } from '@/schema'
import type { Relation } from '@/schema/relations'
import { defineStore } from 'pinia'
import { computed, reactive, shallowReactive, shallowRef, watch } from 'vue'
import { schemas } from '@/schema'
import { cascadeRelations, childRelations, emptyParentRelations } from '@/schema/relations'
import { allColumns, idColumnOf } from '@/schema/types'
import { isEmpty, validateRow } from '@/schema/validation'
import { fetchTable } from '@/services/appScript'
import { createQueue } from './queue'
import { createRowGetters } from './rowGetters'

const pendingLoads = new Map<TableKey, Promise<void>>()

interface HasId {
  id: string
}

// 流程存檔點：每張表於首次改動前保留原值（快取與佇列），見 docs/topics/store.md
interface FlowSnapshot {
  rows: Map<TableKey, unknown[] | undefined>
  queue: Map<TableKey, TableQueue>
}

interface Fetched {
  rows: HasId[]
  modifiedTime: string
}

export const useTablesStore = defineStore('tables', () => {
  // 畫面的單一資料來源，包含已推送與未推送的變更，畫面無須區分
  const rows = shallowReactive<Partial<Record<TableKey, unknown[]>>>({})
  const loading = reactive<Partial<Record<TableKey, boolean>>>({})
  const error = reactive<Partial<Record<TableKey, string | null>>>({})
  const activeFlow = shallowRef<FlowSnapshot | null>(null)
  // 開啟中的表單數。不為零時禁止同步，以免重新抓取覆蓋編輯中的內容
  const syncHolds = shallowRef(0)

  // 待推送內容的單一資料來源，以及 row 上的 getter
  const queue = createQueue()
  const { attachGetters } = createRowGetters(rows)

  const canSync = computed(() => activeFlow.value === null && syncHolds.value === 0)

  // 不可同步時抓取完成的已載入表，恢復可同步時才套用。同一張表只保留最新的一次
  const deferred = new Map<TableKey, Fetched>()

  watch(canSync, value => {
    if (value) {
      for (const [table, fetched] of deferred) {
        apply(table, fetched)
      }
    }
  })

  // 抓取的列蓋上尚未推送的操作後存入快取。modifiedTime 為檔案層級的時間，每張表的值相同，推送時作為 since
  function apply (table: TableKey, { rows: fetched, modifiedTime }: Fetched) {
    deferred.delete(table)
    const byId = new Map(fetched.map(row => [row.id, row]))
    for (const [id, op] of queue.opsOf(table)) {
      if (op.kind === 'delete') {
        byId.delete(id)
      } else {
        byId.set(id, { ...byId.get(id), ...op.values, id })
      }
    }
    rows[table] = [...byId.values()].map(row => attachGetters(table, row))
    queue.knownModifiedTime.value = modifiedTime
  }

  async function load (table: TableKey) {
    const existing = pendingLoads.get(table)
    if (existing) {
      await existing
      return
    }

    const promise = (async () => {
      // 已有快取的表在背景重新抓取，畫面保留原本的列，不顯示載入中
      loading[table] = !(table in rows)
      error[table] = null
      try {
        const fetched = await fetchTable<HasId>(table)
        if (table in rows && !canSync.value) {
          deferred.set(table, fetched)
        } else {
          apply(table, fetched)
        }
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

  // 須一併載入的表：ref 欄位（含虛擬）指向的父表，以及指向此表的子表
  function tablesNeededBy (table: TableKey): TableKey[] {
    const parents = allColumns(schemas[table]).flatMap(column => column.type === 'ref' ? [column.refTable as TableKey] : [])
    const children = childRelations(table).map(relation => relation.childTable)
    return [...new Set([...parents, ...children])]
  }

  // 一併載入關聯的表，供 getter 與連帶刪除使用。seen 防止父子互相需要的循環
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

  // 表單頁作用中時持有一個，離開時釋放
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

  // 推送後重新抓取。推送失敗時不重新抓取
  async function refresh (force = false): Promise<boolean> {
    if (!canSync.value || !await flush(force)) {
      return false
    }

    await reload()
    return true
  }

  // 重新抓取已載入與載入失敗的表。載入失敗的表不在 rows 中，須另外列入
  async function reload (): Promise<void> {
    const failed = Object.keys(error).filter(table => error[table as TableKey])
    const tables = new Set([...Object.keys(rows), ...failed]) as Set<TableKey>
    await Promise.all([...tables].map(table => load(table)))
  }

  // 流程首次改動此表前保留原值。同一張表只保留第一次
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

  // 佇列不處理流程，加入操作前先建立流程的存檔
  function enqueue (table: TableKey, id: string, kind: PendingOp['kind'], values: Record<string, unknown>) {
    remember(table)
    queue.enqueue(table, id, kind, values)
  }

  async function flush (force = false): Promise<boolean> {
    if (activeFlow.value) {
      // 流程進行中禁止推送，推送後即無法回滾
      queue.fail('流程進行中，無法推送')
      return false
    }

    return queue.flush(force)
  }

  // 衝突的處理之一：放棄未推送的變更並重新抓取，以 Sheet 的內容為準
  async function discardAndReload (): Promise<void> {
    queue.discard()
    await reload()
  }

  // 衝突的處理之二：不帶 since 再次推送，只覆蓋修改過的欄位。成功後重新抓取
  async function forcePush (): Promise<boolean> {
    return refresh(true)
  }

  // 建立存檔點。同一時間只能有一個，巢狀的流程拋出錯誤（見 docs/topics/actions.md 的「連續動作（流程）」）
  function beginFlow (): void {
    if (activeFlow.value) {
      throw new Error('上一個流程還沒結束')
    }

    activeFlow.value = { rows: new Map(), queue: new Map() }
  }

  // 流程完成：移除存檔點，變更留在佇列中等待推送
  function commitFlow (): void {
    activeFlow.value = null
  }

  // 流程取消：快取與佇列還原為流程開始前的狀態，未改動的表維持原狀
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

  // 寫入前再次驗證，攔截繞過表單的寫入。有錯誤時拋出，不做任何修改
  function assertValid (table: TableKey, values: Record<string, unknown>, keys?: readonly string[]): void {
    const errors = validateRow(values, schemas[table], keys)
    const messages = Object.values(errors)
    if (messages.length > 0) {
      throw new Error(messages.join('、'))
    }
  }

  // 主鍵有值時以其為 id，為空時才以 newId 產生並填回主鍵
  function create<Row extends HasId> (table: TableKey, values: Record<string, unknown>): Row {
    const schema = schemas[table]
    const key = schema.idColumn
    const generated = isEmpty(values[key]) ? schema.newId?.() : undefined
    const filled = generated === undefined ? values : { ...values, [key]: generated }
    assertValid(table, filled)

    // 後端將已存在的 id 視為重送而略過，因此須於此攔截重複的 id
    const id = String(filled[key])
    const label = idColumnOf(schema).label
    if ((rows[table] ?? []).some(row => (row as HasId).id === id)) {
      throw new Error(`${label}「${id}」已存在`)
    }
    if (queue.kindOf(table, id) === 'delete') {
      throw new Error(`${label}「${id}」剛被刪除，推送之後才能再使用`)
    }

    const created = attachGetters(table, { ...filled, id } as Row)

    patch(table, list => [...list, created])
    enqueue(table, id, 'create', filled)

    return created
  }

  function update<Row extends HasId> (table: TableKey, id: string, values: Record<string, unknown>): Row {
    const schema = schemas[table]
    const key = schema.idColumn
    if (key in values && values[key] !== id) {
      throw new Error(`${idColumnOf(schema).label}建立後不能修改`)
    }
    // 主鍵不變，無須寫回
    const changes = Object.fromEntries(Object.entries(values).filter(([column]) => column !== key))

    // values 可只含部分欄位。只驗證這些欄位，但以合併後的整列驗證，跨欄位的 validate 才能讀取其他欄
    const existing = (rows[table] ?? []).find(row => (row as HasId).id === id) as Record<string, unknown> | undefined
    assertValid(table, { ...existing, ...changes }, Object.keys(changes))

    // ref 修改前的父列，寫入後檢查是否已沒有子列
    const leftParents = existing
      ? parentsOf(table, [existing], column => column in changes && changes[column] !== existing[column])
      : new Map<Relation, Set<string>>()

    let updated = { id, ...changes } as Row

    patch(table, list => list.map(row => {
      if ((row as Row).id !== id) {
        return row
      }
      updated = attachGetters(table, { ...(row as Row), ...changes, id } as Row)
      return updated
    }))
    enqueue(table, id, 'update', changes)
    removeEmptyParents(leftParents)

    return updated
  }

  // 表單等處的暫時列：掛上與快取相同的 getter（虛擬欄位、$label、父列與子列），不加入快取
  function withGetters<Row extends object> (table: TableKey, values: Row): Row {
    return attachGetters(table, { ...values } as Row & HasId)
  }

  function remove (table: TableKey, id: string): void {
    removeMany(table, [id])
  }

  // 刪除後沿標示 cascade 的關聯遞迴刪除子列，同樣經過 patch 與 enqueue（見 docs/topics/schema.md 的「連帶刪除」）
  function removeMany (table: TableKey, ids: Iterable<string>): void {
    const targets = new Set(ids)
    if (targets.size === 0) {
      return
    }

    // 刪除前先確認子表皆已載入
    const cascades = cascadeRelations(table)
    for (const relation of cascades) {
      if (!rows[relation.childTable]) {
        throw new Error(`子表 "${relation.childTable}" 尚未載入，無法連帶刪除`)
      }
    }

    // 被刪除的列所指向的父列，刪除後檢查是否已沒有子列
    const removed = (rows[table] ?? []).filter(row => targets.has((row as HasId).id)) as Record<string, unknown>[]
    const leftParents = parentsOf(table, removed)

    patch(table, list => list.filter(row => !targets.has((row as HasId).id)))
    for (const id of targets) {
      enqueue(table, id, 'delete', {})
    }

    for (const relation of cascades) {
      removeMany(relation.childTable, (rows[relation.childTable] ?? [])
        .filter(row => targets.has((row as Record<string, unknown>)[relation.column] as string))
        .map(row => (row as HasId).id))
    }

    removeEmptyParents(leftParents)
  }

  // 標示 onEmpty 的關聯中，這些列指向的父列 id。filter 用於只檢查有變動的欄位（update）
  function parentsOf (
    table: TableKey,
    list: readonly Record<string, unknown>[],
    filter: (column: string) => boolean = () => true,
  ): Map<Relation, Set<string>> {
    const result = new Map<Relation, Set<string>>()
    for (const relation of emptyParentRelations(table)) {
      if (!filter(relation.column)) {
        continue
      }
      const ids = new Set(list
        .map(row => row[relation.column])
        .filter((id): id is string => typeof id === 'string' && id !== ''))
      if (ids.size > 0) {
        result.set(relation, ids)
      }
    }
    return result
  }

  // 子列減少後，刪除仍存在但已沒有子列的父列（經由 removeMany 向上遞迴）
  function removeEmptyParents (parents: Map<Relation, Set<string>>): void {
    for (const [relation, ids] of parents) {
      const children = (rows[relation.childTable] ?? []) as Record<string, unknown>[]
      const existing = new Set((rows[relation.parentTable] ?? []).map(row => (row as HasId).id))
      removeMany(relation.parentTable, [...ids].filter(id =>
        existing.has(id) && !children.some(row => row[relation.column] === id)))
    }
  }

  return {
    rows,
    loading,
    error,
    hasPending: queue.hasPending,
    flushing: queue.flushing,
    flushError: queue.flushError,
    conflict: queue.conflict,
    edits: queue.edits,
    canSync,
    holdSync,
    ensureLoaded,
    reload,
    refresh,
    flush,
    discardAndReload,
    forcePush,
    beginFlow,
    commitFlow,
    rollbackFlow,
    create,
    update,
    remove,
    removeMany,
    withGetters,
  }
})
