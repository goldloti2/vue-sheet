import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import { useDisplay } from 'vuetify'

// 手機或電腦排版的唯一判斷，暫用 Vuetify 的 mobile（門檻見 docs/design/dashboard.md）
export function useCompactLayout (): ComputedRef<boolean> {
  const { mobile } = useDisplay()
  return computed(() => mobile.value)
}
