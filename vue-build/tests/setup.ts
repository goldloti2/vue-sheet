import { vi } from 'vitest'

// 測試不連線。VITE_APPS_SCRIPT_URL 被設定時，請求於此失敗，不會送到真的後端
vi.stubGlobal('fetch', () => {
  throw new Error('測試中不可連線')
})
