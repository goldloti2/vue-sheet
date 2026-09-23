import type { HistoryState, RouteLocationRaw } from 'vue-router'
import { computed, shallowRef } from 'vue'
import { isNavigationFailure } from 'vue-router'
import { notify } from '@/composables/shell/useNotify'
import router, { leaveAfterAction } from '@/router'
import { useTablesStore } from '@/stores/tables'

// 使用者在流程中途離開（返回、導覽列、改網址）時，等待中的步驟會收到這個
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

// 同一時間只會有一個步驟在等表單送出（見 docs/architecture.md）
const pendingStep = shallowRef<PendingStep | null>(null)
// 這條流程已經走了幾步。第一步要 push（保住發起流程的那一頁），之後才 replace
const stepsTaken = shallowRef(0)

// 目前這張表單前面已經有步驟寫過東西了：取消它就是整條收回，表單要據此換確認文案
export const hasEarlierSteps = computed(() => pendingStep.value !== null && stepsTaken.value > 1)

function cancelPendingStep (): void {
  const step = pendingStep.value
  pendingStep.value = null
  step?.reject(new FlowCancelled())
}

// 任何導覽都算放棄。runStep 自己的導覽不會誤觸：它是等這個跑完才登記的
router.afterEach(() => {
  cancelPendingStep()
})

// 導覽型步驟：開一張表單，等它送出成功，拿回建好／改好的那筆
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

// 表單送出成功後呼叫。有步驟在等就交棒並回傳 true，沒有就回傳 false 讓表單照舊離開
export function resumeStep (row: object): boolean {
  const step = pendingStep.value
  if (!step) {
    return false
  }

  pendingStep.value = null
  step.resolve(row)
  return true
}

// 流程外殼：開存檔點跑 body，成功就 commit，中途放棄或拋錯就 rollback
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
      // 連接器自己壞掉：那一步的表單往往已經送出了，不能把人留在上面
      notify(error instanceof Error ? error.message : String(error), 'error')
      leaveAfterAction('/')
    }
  }
}
