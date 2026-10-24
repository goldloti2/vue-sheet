import type { InjectionKey, Ref } from 'vue'
import { inject, shallowRef } from 'vue'

// AppShell 提供：覆蓋整頁的元件（篩選抽屜）開啟時為 true，PageFab 據此隱藏
export const overlayOpenKey: InjectionKey<Ref<boolean>> = Symbol('overlayOpen')

const NEVER_OPEN: Ref<boolean> = shallowRef(false)

export function useOverlayOpen (): Ref<boolean> {
  return inject(overlayOpenKey, NEVER_OPEN)
}
