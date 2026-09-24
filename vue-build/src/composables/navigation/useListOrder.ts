import type { TableKey } from '@/schema'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, onActivated, onDeactivated, reactive, shallowRef, toValue, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { usePanelActive } from '@/composables/shell/usePanelActive'

// 列表頁把「畫面上實際看到的順序」發布出來，detail頁靠它算前後鄰居。
const orders = reactive(new Map<TableKey, string[]>())

export function useListOrder (table: TableKey, ids: MaybeRefOrGetter<string[]>): void {
  // 被 KeepAlive 收起來的列表、以及不是當前頁籤的面板，都仍然全速運轉，不擋的話會蓋掉當前那份順序
  const cached = shallowRef(true)
  const panelActive = usePanelActive()
  onActivated(() => {
    cached.value = true
  })
  onDeactivated(() => {
    cached.value = false
  })

  // 只停止更新、不清掉：detail 頁是在列表離場之後才來讀的
  watchEffect(() => {
    if (cached.value && panelActive.value) {
      orders.set(table, [...toValue(ids)])
    }
  })
}

export interface Siblings {
  prev: string | null
  next: string | null
}

export interface SiblingNav {
  siblings: ComputedRef<Siblings>
  goPrev: () => void
  goNext: () => void
  swipe: { left: () => void, right: () => void }
}

// detail 頁呼叫：上/下一筆的導覽。
export function useSiblingNav (table: TableKey, id: MaybeRefOrGetter<string>): SiblingNav {
  const router = useRouter()

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

  function go (target: string | null) {
    if (target) {
      void router.replace(`/${table}/${target}`)
    }
  }

  const goPrev = () => go(siblings.value.prev)
  const goNext = () => go(siblings.value.next)

  return { siblings, goPrev, goNext, swipe: { left: goNext, right: goPrev } }
}

// 給 router 判斷「同一個路由換 id」的動畫方向用。
export function siblingDirection (fromId: string, toId: string): 'page-forward' | 'page-back' | null {
  for (const order of orders.values()) {
    const from = order.indexOf(fromId)
    const to = order.indexOf(toId)
    if (from !== -1 && to !== -1 && from !== to) {
      return to > from ? 'page-forward' : 'page-back'
    }
  }
  return null
}
