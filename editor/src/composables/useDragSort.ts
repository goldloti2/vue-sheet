import { computed, shallowRef } from 'vue'

export interface DragSortEntry<T> {
  item: T
  /** 原本的索引 */
  index: number
}

interface DragSortOptions<T> {
  items: () => readonly T[]
  /** 項目的來源。來源改變時，拖曳中的順序即失效，例如修改寫入後重新解析 */
  source: () => unknown
  /** 放開時，把 from 移到 to */
  commit: (from: number, to: number) => Promise<unknown>
}

// 拖曳經過時即依新的順序排列，搭配 TransitionGroup 產生移動的動畫。放開時才寫入
export function useDragSort<T> ({ items, source, commit }: DragSortOptions<T>) {
  const from = shallowRef<number | null>(null)
  const to = shallowRef<number | null>(null)
  // 開始拖曳時的來源
  const origin = shallowRef<unknown>(null)
  let dropped = false

  const active = computed(() => from.value !== null && to.value !== null && origin.value === source())

  const entries = computed<DragSortEntry<T>[]>(() => {
    const list = items().map((item, index) => ({ item, index }))
    if (active.value) {
      list.splice(to.value!, 0, ...list.splice(from.value!, 1))
    }
    return list
  })

  const reset = () => {
    from.value = null
    to.value = null
  }

  return {
    entries,
    /** 拖曳中的項目的原本索引 */
    dragging: computed(() => active.value ? from.value : null),
    /** image 為拖曳時的影像，省略時為被拖曳的元素。Firefox 須有資料才開始拖曳 */
    start: (event: DragEvent, index: number, image?: HTMLElement | null) => {
      from.value = index
      to.value = index
      origin.value = source()
      dropped = false
      event.dataTransfer?.setData('text/plain', '')
      if (image) {
        event.dataTransfer?.setDragImage(image, 16, 16)
      }
    },
    /** position 為目前畫面上的位置 */
    over: (event: DragEvent, position: number) => {
      if (from.value === null) {
        return
      }
      event.preventDefault()
      to.value = position
    },
    // 寫入完成前保留拖曳後的順序。寫入失敗時改回原本的順序
    drop: async () => {
      dropped = true
      if (from.value === null || to.value === null || from.value === to.value || !active.value) {
        reset()
        return
      }
      const before = source()
      await commit(from.value, to.value)
      if (source() === before) {
        reset()
      }
    },
    end: () => {
      if (!dropped) {
        reset()
      }
    },
  }
}
