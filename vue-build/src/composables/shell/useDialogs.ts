import { reactive, shallowReactive, watch } from 'vue'
import router from '@/router'

// 全 App 各一份的小東西，由 AppShell 掛一個實例：是／否確認框與 snackbar。
// 不走 provide/inject 是因為它們跟頁面的生滅無關，隨時都能叫（動作裡、composable 裡都行）

// 對話框上的一顆鈕。「取消」永遠在、不用列
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

// 問一題、給幾個選項，回傳按下去那顆的 key。取消、點對話框外面、換頁都是 null（什麼都不做）
export function choose (title: string, text: string, choices: DialogChoice[]): Promise<string | null> {
  // 上一個還開著就當作取消
  settle(null)

  confirmDialog.title = title
  confirmDialog.text = text
  confirmDialog.choices = choices
  confirmDialog.open = true

  return new Promise(resolve => {
    pending = resolve
  })
}

// 是／否：只有一顆「確定」的 choose
export async function confirm (title: string, text: string): Promise<boolean> {
  return await choose(title, text, [{ key: 'ok', label: '確定', color: 'error' }]) === 'ok'
}

export function pickChoice (key: string): void {
  settle(key)
}

// 點對話框外面關掉也算取消
watch(() => confirmDialog.open, open => {
  if (!open) {
    settle(null)
  }
})

// 對話框掛在 AppShell 上會跨路由存活，換頁就關掉
router.afterEach(() => {
  settle(null)
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
