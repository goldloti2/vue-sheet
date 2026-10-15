import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import { useDisplay } from 'vuetify'

// 手機或電腦排版的唯一判斷（見 docs/dashboard.md）。規則只寫於此，日後改為依內容區寬度或依裝置時只改這裡；
// 暫定沿用 Vuetify 的 mobile：視窗寬度小於 1145px 即為手機
export function useCompactLayout (): ComputedRef<boolean> {
  const { mobile } = useDisplay()
  return computed(() => mobile.value)
}
