import type { PageAction } from '@/composables/actions/useTableActions'
import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'
import { confirm } from '@/composables/useConfirm'
import { notify } from '@/composables/useNotify'

// 執行動作的單一入口：有 confirm 先問，錯誤統一用 snackbar 報，頁面不用自己管
export const runActionKey: InjectionKey<(action: PageAction) => void> = Symbol('runAction')

// 給渲染動作按鈕的元件用（PageFab、AppShell）。不在 AppShell 底下就退回直接執行
export function useRunAction (): (action: PageAction) => void {
  const run = inject(runActionKey, null)

  return (action: PageAction) => {
    if (run) {
      run(action)
    } else {
      void action.onClick()
    }
  }
}

async function runAction (action: PageAction): Promise<void> {
  if (action.confirm && !await confirm(action.confirm.title, action.confirm.text)) {
    return
  }
  await action.onClick()
}

export function provideActionRunner (): (action: PageAction) => void {
  function run (action: PageAction) {
    // 沒接住的話會變成 unhandled rejection
    runAction(action).catch((error: unknown) => {
      notify(error instanceof Error ? error.message : String(error), 'error')
    })
  }

  provide(runActionKey, run)
  return run
}
