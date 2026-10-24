import type { TableKey } from '@/schema'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, onActivated, onDeactivated, reactive, shallowRef, toValue, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardSelection } from '@/composables/shell/useDashboardSelection'
import { usePanelActive } from '@/composables/shell/usePanelActive'

// 列表頁發布畫面上實際的順序，詳細頁以此計算上一列與下一列
const orders = reactive(new Map<TableKey, string[]>())

export function useListOrder (table: TableKey, ids: MaybeRefOrGetter<string[]>): void {
  // KeepAlive 保留的列表與非目前頁籤的面板仍在運作，因此只由作用中的列表發布順序
  const cached = shallowRef(true)
  const panelActive = usePanelActive()
  onActivated(() => {
    cached.value = true
  })
  onDeactivated(() => {
    cached.value = false
  })

  // 只停止更新，不清除。詳細頁於列表離開畫面後才讀取
  watchEffect(() => {
    if (cached.value && panelActive.value) {
      orders.set(table, [...toValue(ids)])
    }
  })
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
