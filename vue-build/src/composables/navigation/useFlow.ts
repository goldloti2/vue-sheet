import type { OpenFormOptions } from '@/composables/shell/useFormLayers'
import type { TableKey } from '@/schema'
import { notify } from '@/composables/shell/useDialogs'
import { leaveKeptEntry, openForm } from '@/composables/shell/useFormLayers'
import { useTablesStore } from '@/stores/tables'

// 使用者於流程中途離開（取消、返回）時，等待中的步驟收到此錯誤
export class FlowCancelled extends Error {
  constructor () {
    super('flow cancelled')
    this.name = 'FlowCancelled'
  }
}

// 流程已執行的步數。第二步起取代上一步的格子，且離開時一律詢問（見 docs/topics/actions.md 的「連續動作（流程）」）
let stepsTaken = 0

// 開啟表單，等待送出成功，回傳新增或修改後的列
export async function runStep<Row extends object> (table: TableKey, options: OpenFormOptions = {}): Promise<Row> {
  const later = stepsTaken > 0
  stepsTaken++

  const row = await openForm<Row>(table, options, { replace: later, alwaysAsk: later })
  if (row === null) {
    throw new FlowCancelled()
  }
  return row
}

// 流程外殼：建立存檔點後執行 body。成功時 commit，中途放棄或拋出錯誤時 rollback
export async function runFlow (body: () => Promise<void>): Promise<void> {
  const store = useTablesStore()
  store.beginFlow()
  stepsTaken = 0

  try {
    await body()
    store.commitFlow()
  } catch (error) {
    store.rollbackFlow()

    if (!(error instanceof FlowCancelled)) {
      notify(error instanceof Error ? error.message : String(error), 'error')
    }
  } finally {
    leaveKeptEntry()
  }
}
