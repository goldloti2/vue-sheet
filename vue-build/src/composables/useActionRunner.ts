import type { PageAction } from '@/composables/actions/useTableActions'
import type { InjectionKey } from 'vue'
import { inject, provide, reactive } from 'vue'

// 執行動作的單一入口。要確認的動作在這裡開對話框、跑非同步、接錯誤，
// 所以頁面不用自己管 ConfirmDialog 和 loading/error
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

export interface ActionDialogState {
  open: boolean
  title: string
  text: string
  loading: boolean
  error: string | null
}

export function provideActionRunner () {
  const dialog = reactive<ActionDialogState>({
    open: false,
    title: '',
    text: '',
    loading: false,
    error: null,
  })

  let pending: PageAction | null = null

  function run (action: PageAction) {
    if (!action.confirm) {
      void action.onClick()
      return
    }

    pending = action
    dialog.title = action.confirm.title
    dialog.text = action.confirm.text
    dialog.error = null
    dialog.loading = false
    dialog.open = true
  }

  provide(runActionKey, run)

  async function confirm () {
    if (!pending) {
      return
    }

    dialog.loading = true
    dialog.error = null

    try {
      await pending.onClick()
      dialog.open = false
    } catch (error) {
      dialog.error = error instanceof Error ? error.message : String(error)
    } finally {
      dialog.loading = false
    }
  }

  return { dialog, confirm, run }
}
