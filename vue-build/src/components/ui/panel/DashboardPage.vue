<script lang="ts" setup>
  import type { DashboardContext, DashboardPanelEntry } from '@/components/ui/panel/dashboardContext'
  import type { PanelRequest, PanelSize } from '@/components/ui/panel/placePanels'
  import { computed, onBeforeUnmount, onMounted, provide, shallowReactive, shallowRef, useTemplateRef } from 'vue'
  import { AUTO_ROWS_MAX, dashboardKey } from '@/components/ui/panel/dashboardContext'
  import { placePanels } from '@/components/ui/panel/placePanels'
  import { useCompactLayout } from '@/composables/shell/useCompactLayout'
  import { provideSharedListControls } from '@/composables/shell/useSharedListControls'
  import { schemas } from '@/schema'

  // 同時顯示多個面板（見 docs/dashboard.md）：方格排版、關注點，以及各面板列表共用的搜尋、篩選與排序
  const { layout = {} } = defineProps<{
    // 面板的 name → 手機與電腦的排版；未列出的面板或留空的斷點為自動
    layout?: Record<string, { mobile?: PanelSize, desktop?: PanelSize }>
  }>()

  const GAP = 8
  // 寬的格數：手機 6、電腦 24；面板最少 2 格寬
  const COLS = { mobile: 6, desktop: 24 }
  const MIN_WIDTH = 2
  // 電腦的自動：一個畫面放得下 3×2 個面板
  const DESKTOP_AUTO = { w: 8, h: 7 }

  const compact = useCompactLayout()
  const cols = computed(() => compact.value ? COLS.mobile : COLS.desktop)

  const panels = shallowReactive<DashboardPanelEntry[]>([])
  const focused = shallowRef<string | null>(null)

  function firstFramed (): string | null {
    return panels.find(entry => entry.framed)?.name ?? null
  }

  function register (entry: DashboardPanelEntry): () => void {
    panels.push(entry)
    // 預設的關注點為第一個有小外殼的面板
    focused.value ??= firstFramed()

    return () => {
      panels.splice(panels.indexOf(entry), 1)
      if (focused.value === entry.name) {
        focused.value = firstFramed()
      }
    }
  }

  // 沒有小外殼的面板不能成為關注點；多選期間關注點不移動
  function focus (name: string) {
    const entry = panels.find(panel => panel.name === name)
    if (!entry?.framed || panels.some(panel => panel.selecting.value && panel.name !== name)) {
      return
    }
    focused.value = name
  }

  // 依排版類型決定寬高：{ w, h } 固定、{ h } 只控制高（寬同自動）、留空為自動
  function requestFor (entry: DashboardPanelEntry): PanelRequest {
    const size = layout[entry.name]?.[compact.value ? 'mobile' : 'desktop'] ?? {}
    const autoWidth = compact.value ? cols.value : DESKTOP_AUTO.w
    const autoHeight = compact.value ? (entry.measuredRows.value ?? AUTO_ROWS_MAX) : DESKTOP_AUTO.h

    return {
      name: entry.name,
      w: Math.max(size.w ?? autoWidth, MIN_WIDTH),
      h: size.h ?? autoHeight,
      x: size.x,
      y: size.y,
    }
  }

  const placements = computed(() => placePanels(panels.map(entry => requestFor(entry)), cols.value))

  // 一格的邊長：內容區寬度扣除間距後等分。格子的高等於寬
  const root = useTemplateRef('root')
  const contentWidth = shallowRef(0)
  const observer = new ResizeObserver(([entry]) => {
    contentWidth.value = entry?.contentRect.width ?? 0
  })
  onMounted(() => {
    if (root.value) {
      observer.observe(root.value)
    }
  })
  onBeforeUnmount(() => observer.disconnect())

  const cell = computed(() => (contentWidth.value - (cols.value - 1) * GAP) / cols.value)

  const context: DashboardContext = {
    focused,
    focus,
    register,
    placement: name => computed(() => placements.value.get(name)),
    cellSize: cell,
    gap: GAP,
  }
  provide(dashboardKey, context)

  // 抽屜打開時先停在關注面板的那張表
  const focusedTableLabel = computed(() => {
    const table = panels.find(entry => entry.name === focused.value)?.table
    return table ? schemas[table].tableLabel : ''
  })
  provideSharedListControls(focusedTableLabel)

  const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${cols.value}, minmax(0, 1fr))`,
    gridAutoRows: `${Math.max(cell.value, 0)}px`,
    gap: `${GAP}px`,
  }))
</script>

<template>
  <div ref="root" class="dashboard" :data-layout="compact ? 'mobile' : 'desktop'">
    <div class="dashboard__grid" :style="gridStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 16px;
}

.dashboard__grid {
  display: grid;
}
</style>
