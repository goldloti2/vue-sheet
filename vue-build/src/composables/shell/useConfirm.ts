import { shallowReactive, watch } from 'vue'
import router from '@/router'

// 全 App 一個是／否確認框，由 AppShell 渲染；promise 在按確定／取消時 resolve
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
