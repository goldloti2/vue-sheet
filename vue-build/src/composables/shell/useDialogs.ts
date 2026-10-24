import { reactive, shallowReactive, watch } from 'vue'
import router from '@/router'

// 全 App 共用的確認框與 snackbar，由 AppShell 渲染。不經由 provide/inject，任何程式皆可直接呼叫

// 對話框上的一個按鈕。「取消」一律存在，無須列出
export interface DialogChoice {
  key: string
  label: string
  color?: string
}

export const confirmDialog = shallowReactive({
  open: false,
  title: '',
  text: '',
  choices: [] as DialogChoice[],
})

let pending: ((result: string | null) => void) | null = null

function settle (result: string | null): void {
  const resolve = pending
  pending = null
  confirmDialog.open = false
  resolve?.(result)
}

// 詢問一個問題並提供選項，回傳按下的按鈕的 key。取消、點選對話框外側、換頁時皆為 null
export function choose (title: string, text: string, choices: DialogChoice[]): Promise<string | null> {
  // 上一個對話框仍開啟時，視為取消
  settle(null)

  confirmDialog.title = title
  confirmDialog.text = text
  confirmDialog.choices = choices
  confirmDialog.open = true

  return new Promise(resolve => {
    pending = resolve
  })
}

// 是／否：只有「確定」一個按鈕的 choose
export async function confirm (title: string, text: string): Promise<boolean> {
  return await choose(title, text, [{ key: 'ok', label: '確定', color: 'error' }]) === 'ok'
}

export function pickChoice (key: string): void {
  settle(key)
}

// 點選對話框外側關閉時也視為取消
watch(() => confirmDialog.open, open => {
  if (!open) {
    settle(null)
  }
})

// 對話框位於 AppShell，換頁後仍存在，因此換頁時關閉
router.afterEach(() => {
  settle(null)
})

// 一則短訊息，由 AppShell 渲染為 snackbar
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
