import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import { confirm } from '@/composables/useConfirm'
import { hasEarlierSteps } from '@/composables/useFlow'
import router from '@/router'

// 目前活著的表單各登記一個「有沒有改動」的 getter
const dirtyChecks = new Set<() => boolean>()

// 表單頁活著的期間登記，任何離開頁面的導覽都會先問（見 README 4.4）
export function useLeaveGuard (dirty: () => boolean): void {
  onMounted(() => dirtyChecks.add(dirty))
  onActivated(() => dirtyChecks.add(dirty))
  onDeactivated(() => dirtyChecks.delete(dirty))
  onUnmounted(() => dirtyChecks.delete(dirty))
}

// 離開前要不要問：前面的步驟已經寫了東西（離開等於整條收回）、或這張表單改過
export function leaveConfirmText (): string | undefined {
  if (hasEarlierSteps.value) {
    return '是否放棄未儲存的變更（包含之前的變更）？'
  }
  for (const dirty of dirtyChecks) {
    if (dirty()) {
      return '有尚未儲存的變更，確定要離開嗎？'
    }
  }
  return undefined
}

// 返回鍵、導覽列、改網址、底部的取消都走這裡；說不就擋下導覽，頁面不動
router.beforeEach(async () => {
  const text = leaveConfirmText()
  return text === undefined ? true : confirm('放棄變更', text)
})
