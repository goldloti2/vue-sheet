import type { TableKey } from '@/schema'
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import { computed, inject, provide, reactive, toValue } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardSelection } from '@/composables/shell/useDashboardSelection'

// 點擊一列時發布的順序，詳細頁以此計算上一列與下一列
const orders = reactive(new Map<TableKey, string[]>())

// 直接發布一份順序，例如圖表點擊一組時發布該組的列
export function publishListOrder (table: TableKey, ids: readonly string[]): void {
  orders.set(table, [...ids])
}

const publishKey: InjectionKey<() => void> = Symbol('publishListOrder')

// 列表提供畫面上的順序，其中的列被點擊時才發布（見 usePublishListOrder）
export function provideListOrder (table: TableKey, ids: MaybeRefOrGetter<readonly string[]>): void {
  provide(publishKey, () => publishListOrder(table, toValue(ids)))
}

// 列的點擊呼叫：發布所在列表的順序。不在提供順序的列表中時不做任何事
export function usePublishListOrder (): () => void {
  return inject(publishKey, () => {})
}

interface Siblings {
  prev: string | null
  next: string | null
}

interface SiblingNav {
  siblings: ComputedRef<Siblings>
  goPrev: () => void
  goNext: () => void
  swipe: { left: () => void, right: () => void }
}

// 詳細頁呼叫：上一列與下一列的導覽。於 dashboard 的面板中改為切換選取，不離開 dashboard
export function useSiblingNav (table: TableKey, id: MaybeRefOrGetter<string>): SiblingNav {
  const router = useRouter()
  const dashboard = useDashboardSelection()

  const siblings = computed<Siblings>(() => {
    const order = orders.get(table)
    const index = order?.indexOf(toValue(id)) ?? -1
    if (!order || index === -1) {
      return { prev: null, next: null }
    }

    return {
      prev: index > 0 ? order[index - 1] : null,
      next: index < order.length - 1 ? order[index + 1] : null,
    }
  })

  function go (target: string | null, direction: 'forward' | 'back') {
    if (!target) {
      return
    }
    if (dashboard) {
      dashboard.select(table, target, direction)
    } else {
      void router.replace(`/${table}/${target}`)
    }
  }

  const goPrev = () => go(siblings.value.prev, 'back')
  const goNext = () => go(siblings.value.next, 'forward')

  return { siblings, goPrev, goNext, swipe: { left: goNext, right: goPrev } }
}

// 供 router 判斷同一個路由切換 id 時的動畫方向
export function siblingDirection (fromId: string, toId: string): 'forward' | 'back' | null {
  for (const order of orders.values()) {
    const from = order.indexOf(fromId)
    const to = order.indexOf(toId)
    if (from !== -1 && to !== -1 && from !== to) {
      return to > from ? 'forward' : 'back'
    }
  }
  return null
}
