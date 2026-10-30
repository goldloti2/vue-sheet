import type { Chart, LinearScale, LinearScaleOptions } from 'chart.js'

// 直的數值軸：刻度的間距下限較 Chart.js 的預設大，上限沿用 Chart.js（見 docs/design/chart.md 的「外觀」）
export const SPACED_SCALE = 'spacedLinear'
const MIN_TICK_SPACING = 28

// 向 Chart.js 的型別登記此軸，選項與 linear 相同
declare module 'chart.js' {
  interface CartesianScaleTypeRegistry {
    spacedLinear: { options: LinearScaleOptions }
  }
}

let registered = false

// Chart.js 於圖表掛載時才載入，因此類別於載入後才建立並登記
export function registerSpacedScale (ChartJs: typeof Chart, Base: typeof LinearScale) {
  if (registered) {
    return
  }
  class SpacedScale extends Base {
    static override id = SPACED_SCALE
    // 取代 Chart.js 依字高計算的刻度數。每次排版皆以當下的軸高重算，刻意不用會被快取的 ticks.maxTicksLimit
    computeTickLimit (): number {
      return Math.ceil(this.height / MIN_TICK_SPACING)
    }
  }
  ChartJs.register(SpacedScale)
  registered = true
}
