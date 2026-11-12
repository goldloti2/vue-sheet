import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useLongPress } from '@/composables/list/useLongPress'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function setup () {
  const onLongPress = vi.fn()
  const scope = effectScope()
  const handlers = scope.run(() => useLongPress(onLongPress))!
  return { handlers, onLongPress }
}

function pointer (pointerType: string) {
  return { pointerType } as PointerEvent
}

function menu () {
  return new Event('contextmenu', { cancelable: true }) as MouseEvent
}

describe('useLongPress', () => {
  it('按住超過時間時觸發，之後的點擊被擋下', () => {
    const { handlers, onLongPress } = setup()
    handlers.onPointerdown(pointer('touch'))
    vi.advanceTimersByTime(500)
    expect(onLongPress).toHaveBeenCalledOnce()
    const click = new Event('click', { cancelable: true }) as MouseEvent
    handlers.onClick(click)
    expect(click.defaultPrevented).toBe(true)
  })

  it('提早放開時不觸發', () => {
    const { handlers, onLongPress } = setup()
    handlers.onPointerdown(pointer('touch'))
    handlers.onPointerup()
    vi.advanceTimersByTime(500)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('觸控按下時擋下長按選單', () => {
    const { handlers } = setup()
    handlers.onPointerdown(pointer('touch'))
    const event = menu()
    handlers.onContextmenu(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('滑鼠按下時不擋下右鍵選單', () => {
    const { handlers } = setup()
    handlers.onPointerdown(pointer('mouse'))
    const event = menu()
    handlers.onContextmenu(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
