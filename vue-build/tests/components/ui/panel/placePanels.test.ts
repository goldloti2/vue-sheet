import type { PanelRequest } from '@/components/ui/panel/placePanels'
import { describe, expect, it, vi } from 'vitest'
import { placePanels } from '@/components/ui/panel/placePanels'

function place (requests: PanelRequest[], cols = 12) {
  return Object.fromEntries(placePanels(requests, cols))
}

describe('placePanels', () => {
  it('沒有座標的面板接在上一個面板的右側，放不下時換到下一列的開頭', () => {
    expect(place([
      { name: 'a', w: 6, h: 2 },
      { name: 'b', w: 4, h: 1 },
      { name: 'c', w: 4, h: 1 },
    ])).toEqual({
      a: { x: 1, y: 1, w: 6, h: 2 },
      b: { x: 7, y: 1, w: 4, h: 1 },
      c: { x: 7, y: 2, w: 4, h: 1 },
    })
  })

  it('換列時略過被佔用的格', () => {
    expect(place([
      { name: 'a', w: 6, h: 3 },
      { name: 'b', w: 6, h: 1 },
      { name: 'c', w: 8, h: 1 },
    ]).c).toEqual({ x: 1, y: 4, w: 8, h: 1 })
  })

  it('只指定 y 時，從該列的開頭尋找', () => {
    expect(place([
      { name: 'a', w: 4, h: 1 },
      { name: 'b', w: 4, h: 1, y: 3 },
    ]).b).toEqual({ x: 1, y: 3, w: 4, h: 1 })
  })

  it('指定 x 時，限制在面板不超出右緣的範圍', () => {
    expect(place([{ name: 'a', w: 4, h: 1, x: 11 }]).a).toEqual({ x: 9, y: 1, w: 4, h: 1 })
    expect(place([{ name: 'a', w: 4, h: 1, x: 0 }]).a).toEqual({ x: 1, y: 1, w: 4, h: 1 })
  })

  it('寬度不超過整行，寬高至少 1', () => {
    expect(place([{ name: 'a', w: 20, h: 0 }]).a).toEqual({ x: 1, y: 1, w: 12, h: 1 })
  })

  it('指定的座標與先放的面板重疊時往右移並警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(place([
      { name: 'a', w: 4, h: 2, x: 1, y: 1 },
      { name: 'b', w: 4, h: 1, x: 3, y: 2 },
    ]).b).toEqual({ x: 5, y: 2, w: 4, h: 1 })
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('依宣告的順序放入，後面的面板可以填入前面留下的空位', () => {
    expect(place([
      { name: 'a', w: 4, h: 1, x: 5, y: 1 },
      { name: 'b', w: 4, h: 1, y: 1 },
    ]).b).toEqual({ x: 1, y: 1, w: 4, h: 1 })
  })
})
