import type { HistoryState, RouteLocationRaw } from 'vue-router'
import { computed, shallowRef } from 'vue'
import { isNavigationFailure } from 'vue-router'
import { notify } from '@/composables/shell/useDialogs'
import router, { leaveAfterAction } from '@/router'
import { useTablesStore } from '@/stores/tables'

// 使用者於流程中途離開（返回、導覽列、修改網址）時，等待中的步驟收到此錯誤
export class FlowCancelled extends Error {
  constructor () {
    super('flow cancelled')
    this.name = 'FlowCancelled'
  }
}

interface PendingStep {
  resolve: (row: object) => void
  reject: (error: Error) => void
}

// 同一時間只有一個步驟等待表單送出（見 docs/topics/actions.md 的「連續動作（流程）」）
const pendingStep = shallowRef<PendingStep | null>(null)
// 流程已執行的步數。第一步以 push 保留發起流程的頁面，之後的步驟以 replace 導覽
const stepsTaken = shallowRef(0)

// 目前表單之前已有步驟寫入資料。此時取消即收回整個流程，表單據此更換確認文字
export const hasEarlierSteps = computed(() => pendingStep.value !== null && stepsTaken.value > 1)

function cancelPendingStep (): void {
  const step = pendingStep.value
  pendingStep.value = null
  step?.reject(new FlowCancelled())
}

// 任何導覽皆視為放棄。runStep 於自身的導覽完成後才登記，因此不會觸發
router.afterEach(() => {
  cancelPendingStep()
})

// 導覽型步驟：開啟表單，等待送出成功，回傳新增或修改後的列
export async function runStep<Row extends object> (
  to: RouteLocationRaw,
  defaults?: Record<string, unknown>,
): Promise<Row> {
  const location = typeof to === 'string' ? { path: to } : to
  const target = { ...location, state: { defaults } as HistoryState }
  const failure = await (stepsTaken.value === 0 ? router.push(target) : router.replace(target))
  if (isNavigationFailure(failure)) {
    throw new FlowCancelled()
  }
  stepsTaken.value++

  return new Promise<Row>((resolve, reject) => {
    pendingStep.value = { resolve: row => resolve(row as Row), reject }
  })
}

// 表單送出成功後呼叫。有等待中的步驟時交出結果並回傳 true，否則回傳 false
export function resumeStep (row: object): boolean {
  const step = pendingStep.value
  if (!step) {
    return false
  }

  pendingStep.value = null
  step.resolve(row)
  return true
}

// 流程外殼：建立存檔點後執行 body。成功時 commit，中途放棄或拋出錯誤時 rollback
export async function runFlow (body: () => Promise<void>): Promise<void> {
  const store = useTablesStore()
  store.beginFlow()
  stepsTaken.value = 0

  try {
    await body()
    store.commitFlow()
  } catch (error) {
    store.rollbackFlow()

    if (!(error instanceof FlowCancelled)) {
      // 連接器本身出錯時，該步驟的表單通常已送出，因此離開該表單
      notify(error instanceof Error ? error.message : String(error), 'error')
      leaveAfterAction('/')
    }
  }
}
