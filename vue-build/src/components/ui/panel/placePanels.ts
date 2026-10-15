// dashboard 各面板於方格中的位置（見 docs/dashboard.md 的「位置的計算」）。純函式：
// CSS grid 遇到座標重疊時直接讓面板疊在一起，因此位置由這裡算好，CSS 僅照著繪製

// 設計者給的排版：皆以格數表示，x、y 自 1 起算
export interface PanelSize {
  x?: number
  y?: number
  w?: number
  h?: number
}

// 交給計算的一個面板：寬高已依排版類型決定
export interface PanelRequest {
  name: string
  w: number
  h: number
  x?: number
  y?: number
}

export interface PanelPlacement {
  x: number
  y: number
  w: number
  h: number
}

// 依宣告的順序逐一放入，重疊時移動後放的那一個：先往右（x + 1），放不下才換到下一列的開頭（y + 1、x 回到 1）。
// 起點：有給的座標照用；沒給 x 時接在上一個面板之後（只給 y 時從該列的開頭），沒給 y 時與上一個面板同一列
export function placePanels (requests: readonly PanelRequest[], cols: number): Map<string, PanelPlacement> {
  const occupied = new Set<string>()
  const placements = new Map<string, PanelPlacement>()

  function fits (x: number, y: number, w: number, h: number): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (occupied.has(`${x + dx},${y + dy}`)) {
          return false
        }
      }
    }
    return true
  }

  function place (name: string, x: number, y: number, w: number, h: number) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        occupied.add(`${x + dx},${y + dy}`)
      }
    }
    placements.set(name, { x, y, w, h })
  }

  // 上一個面板的右側，沒給座標的面板從這裡開始找
  let cursorX = 1
  let cursorY = 1

  for (const request of requests) {
    // 寬度不超過整行，x 不讓面板超出右緣
    const w = Math.min(Math.max(request.w, 1), cols)
    const h = Math.max(request.h, 1)
    const startX = request.x === undefined
      ? (request.y === undefined ? cursorX : 1)
      : Math.min(Math.max(request.x, 1), cols - w + 1)
    const startY = request.y === undefined ? cursorY : Math.max(request.y, 1)

    let x = startX
    let y = startY
    for (;;) {
      if (x + w - 1 > cols) {
        x = 1
        y++
      } else if (fits(x, y, w, h)) {
        break
      } else {
        x++
      }
    }

    // 有給的座標被改動，表示與先放的面板重疊
    const moved = (request.x !== undefined && x !== startX) || (request.y !== undefined && y !== startY)
    if (import.meta.env.DEV && moved) {
      console.warn(`dashboard：面板「${request.name}」與先宣告的面板重疊，已移至第 ${x} 欄、第 ${y} 列`)
    }

    place(request.name, x, y, w, h)
    cursorX = x + w
    cursorY = y
  }

  return placements
}
