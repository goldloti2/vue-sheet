import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { useDragSort } from '@/composables/useDragSort'

// 只用到 preventDefault 與 dataTransfer 的假事件
function dragEvent (): DragEvent {
  return { preventDefault: vi.fn(), dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() } } as unknown as DragEvent
}

function setup (commitResult: 'change' | 'keep') {
  const items = shallowRef(['a', 'b', 'c'])
  const commit = vi.fn(async (from: number, to: number) => {
    if (commitResult === 'change') {
      const next = [...items.value]
      next.splice(to, 0, ...next.splice(from, 1))
      items.value = next
    }
  })
  const sort = useDragSort({ items: () => items.value, source: () => items.value, commit })
  return { items, commit, sort }
}

describe('useDragSort', () => {
  it('shows the new order while dragging', () => {
    const { sort } = setup('change')

    sort.start(dragEvent(), 0)
    sort.over(dragEvent(), 2)

    expect(sort.entries.value.map(entry => entry.item)).toEqual(['b', 'c', 'a'])
    expect(sort.dragging.value).toBe(0)
  })

  it('commits on drop and follows the new items', async () => {
    const { sort, commit } = setup('change')

    sort.start(dragEvent(), 0)
    sort.over(dragEvent(), 2)
    await sort.drop()
    sort.end()

    expect(commit).toHaveBeenCalledWith(0, 2)
    expect(sort.entries.value.map(entry => entry.item)).toEqual(['b', 'c', 'a'])
    expect(sort.dragging.value).toBeNull()
  })

  it('goes back to the original order when the commit changes nothing', async () => {
    const { sort } = setup('keep')

    sort.start(dragEvent(), 0)
    sort.over(dragEvent(), 1)
    await sort.drop()

    expect(sort.entries.value.map(entry => entry.item)).toEqual(['a', 'b', 'c'])
  })

  it('goes back when the drag ends without a drop', () => {
    const { sort, commit } = setup('change')

    sort.start(dragEvent(), 2)
    sort.over(dragEvent(), 0)
    sort.end()

    expect(commit).not.toHaveBeenCalled()
    expect(sort.entries.value.map(entry => entry.item)).toEqual(['a', 'b', 'c'])
  })
})
