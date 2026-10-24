import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import { hasEarlierSteps } from '@/composables/navigation/useFlow'
import { confirm } from '@/composables/shell/useDialogs'
import router from '@/router'

// 每個作用中的表單各登記一個「是否有改動」的 getter
const dirtyChecks = new Set<() => boolean>()

// 表單頁作用中時登記，任何離開頁面的導覽皆先詢問（見 docs/topics/pages.md）
export function useLeaveGuard (dirty: () => boolean): void {
  onMounted(() => dirtyChecks.add(dirty))
  onActivated(() => dirtyChecks.add(dirty))
  onDeactivated(() => dirtyChecks.delete(dirty))
  onUnmounted(() => dirtyChecks.delete(dirty))
}

// 流程中先前的步驟已寫入資料，或目前的表單有改動時，離開前詢問
function leaveConfirmText (): string | undefined {
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

// 返回鍵、導覽列、修改網址與底部的取消皆經過此處。使用者拒絕時取消導覽
router.beforeEach(async () => {
  const text = leaveConfirmText()
  return text === undefined ? true : confirm('放棄變更', text)
})
