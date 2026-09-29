import type { InjectionKey, Ref } from 'vue'
import { inject, shallowRef } from 'vue'

// AppShell 提供：有蓋整頁的東西開著（篩選抽屜）時為 true，浮在 layout 之上的元件（PageFab）據此讓開
export const overlayOpenKey: InjectionKey<Ref<boolean>> = Symbol('overlayOpen')

const NEVER_OPEN: Ref<boolean> = shallowRef(false)

export function useOverlayOpen (): Ref<boolean> {
  return inject(overlayOpenKey, NEVER_OPEN)
}
