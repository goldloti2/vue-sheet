import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import { useDisplay } from 'vuetify'

// 手機或電腦排版的唯一判斷，暫用 Vuetify 的 mobile（見 docs/components/panel/DashboardPage.md 的「排版」）
export function useCompactLayout (): ComputedRef<boolean> {
  const { mobile } = useDisplay()
  return computed(() => mobile.value)
}
