import type { PageAction } from '@/composables/actions/useTableActions'
import type { InjectionKey } from 'vue'
import { inject, onActivated, onDeactivated, onUnmounted, watch } from 'vue'

export const appBarActionsKey: InjectionKey<(actions: PageAction[]) => void> = Symbol('appBarActions')

export function useAppBarActions (source: () => PageAction[]) {
  const setActions = inject(appBarActionsKey)
  if (!setActions) {
    return
  }

  let isActive = true

  watch(source, actions => {
    if (isActive) {
      setActions(actions)
    }
  }, { immediate: true })

  onActivated(() => {
    isActive = true
    setActions(source())
  })

  onDeactivated(() => {
    isActive = false
    setActions([])
  })

  onUnmounted(() => {
    setActions([])
  })
}
