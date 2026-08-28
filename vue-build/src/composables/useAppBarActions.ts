import type { InjectionKey } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { inject, onActivated, onDeactivated, onUnmounted, watch } from 'vue'

export interface AppBarAction {
  key: string
  label: string
  icon: string
  to?: RouteLocationRaw
  onClick?: () => void
}

export const appBarActionsKey: InjectionKey<(actions: AppBarAction[]) => void> = Symbol('appBarActions')

export function useAppBarActions (source: () => AppBarAction[]) {
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
