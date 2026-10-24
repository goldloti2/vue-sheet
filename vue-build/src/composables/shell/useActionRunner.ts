import type { PageAction } from '@/composables/actions/useTableActions'
import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'
import { confirm, notify } from '@/composables/shell/useDialogs'

// 執行動作的單一入口：有 confirm 時先詢問，錯誤統一以 snackbar 顯示
const runActionKey: InjectionKey<(action: PageAction) => void> = Symbol('runAction')

// 供顯示動作按鈕的元件使用（PageFab、AppShell）。不在 AppShell 之下時直接執行
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
    // 須攔截錯誤，否則成為 unhandled rejection
    runAction(action).catch((error: unknown) => {
      notify(error instanceof Error ? error.message : String(error), 'error')
    })
  }

  provide(runActionKey, run)
  return run
}
