import { reactive } from 'vue'

// 全 App 一則短訊息，由 AppShell 渲染成 snackbar。
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
