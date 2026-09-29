import { reactive, shallowReactive, watch } from 'vue'
import router from '@/router'

// 全 App 各一份的小東西，由 AppShell 掛一個實例：是／否確認框與 snackbar。
// 不走 provide/inject 是因為它們跟頁面的生滅無關，隨時都能叫（動作裡、composable 裡都行）

export const confirmDialog = shallowReactive({
  open: false,
  title: '',
  text: '',
})

let pending: ((result: boolean) => void) | null = null

function settle (result: boolean): void {
  const resolve = pending
  pending = null
  confirmDialog.open = false
  resolve?.(result)
}

export function confirm (title: string, text: string): Promise<boolean> {
  // 上一個還開著就當作取消
  settle(false)

  confirmDialog.title = title
  confirmDialog.text = text
  confirmDialog.open = true

  return new Promise(resolve => {
    pending = resolve
  })
}

export function acceptConfirm (): void {
  settle(true)
}

// 點對話框外面關掉也算取消
watch(() => confirmDialog.open, open => {
  if (!open) {
    settle(false)
  }
})

// 對話框掛在 AppShell 上會跨路由存活，換頁就關掉
router.afterEach(() => {
  settle(false)
})

// 一則短訊息，由 AppShell 渲染成 snackbar
export const notice = reactive({
  open: false,
  text: '',
  color: undefined as string | undefined,
})

export function notify (text: string, color?: string): void {
  notice.text = text
  notice.color = color
  notice.open = true
}
