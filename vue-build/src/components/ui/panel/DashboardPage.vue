<script lang="ts" setup>
  import type { DashboardContext, DashboardPanelEntry } from '@/components/ui/panel/dashboardContext'
  import type { PanelRequest, PanelSize } from '@/components/ui/panel/placePanels'
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { computed, inject, nextTick, onBeforeUnmount, onMounted, provide, shallowReactive, shallowRef, useTemplateRef } from 'vue'
  import { useRouter } from 'vue-router'
  import { AUTO_ROWS_MAX, COLS, dashboardKey, GAP } from '@/components/ui/panel/dashboardContext'
  import { placePanels } from '@/components/ui/panel/placePanels'
  import { registerSlot, relaySlot } from '@/composables/shell/useActionSlot'
  import { useCompactLayout } from '@/composables/shell/useCompactLayout'
  import { provideDashboardSelection } from '@/composables/shell/useDashboardSelection'
  import { listControlsKey } from '@/composables/shell/useListControls'
  import { provideSharedListControls } from '@/composables/shell/useSharedListControls'
  import { appBarActionsKey, useAppBarActions, useAppBarHeading, useAppBarSelection } from '@/composables/shell/useShellActions'
  import { beginTransition, canAnimate, markTransition } from '@/composables/shell/viewTransition'
  import { schemas } from '@/schema'

  // 同時顯示多個面板：方格排版、關注點，以及各列表面板共用的搜尋、篩選與排序（見 docs/components/panel/DashboardPage.md）
  const { layout = {}, interactive = false } = defineProps<{
    // 面板的 name → 手機與電腦的排版。未列出的面板或留空的斷點為自動
    layout?: Record<string, { mobile?: PanelSize, desktop?: PanelSize }>
    // 開啟時，點擊一列改為選取，與該列直接相關的面板跟著改變
    interactive?: boolean
  }>()

  if (import.meta.env.DEV && inject(dashboardKey, null)) {
    console.warn('DashboardPage 不可嵌套自身')
  }

  // 面板的最小寬度（格數）
  const MIN_WIDTH = 4
  // 電腦的自動大小（見 docs/design/dashboard.md）
  const DESKTOP_AUTO = { w: 16, h: 14 }

  const compact = useCompactLayout()
  const cols = computed(() => compact.value ? COLS.mobile : COLS.desktop)

  const panels = shallowReactive<DashboardPanelEntry[]>([])
  const focused = shallowRef<string | null>(null)
  const panelTransition = shallowRef<'fade' | 'slide' | null>(null)

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

  // 同一時間只有一個面板能多選
  const selecting = computed(() => panels.find(entry => entry.selection.value)?.name ?? null)

  // 沒有小外殼的面板不能成為關注點。多選期間關注點不移動
  function focus (name: string) {
    const entry = panels.find(panel => panel.name === name)
    if (!entry?.framed || (selecting.value !== null && selecting.value !== name)) {
      return
    }
    focused.value = name
  }

  // 依排版類型決定寬高：{ w, h } 固定，{ h } 只控制高（寬同自動），留空為自動
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

  // 展開：以同一個網址推入一筆 history，於 state 記下面板。返回鍵或 ← 即縮回（見 DashboardPage.md 的「展開」）
  const router = useRouter()
  const ownPath = router.currentRoute.value.fullPath
  const expanded = shallowRef<string | null>(null)

  // 依目前這一筆 history 的 state 決定是否展開。被 KeepAlive 收起時，忽略其他頁面的導覽
  function syncExpanded () {
    if (router.currentRoute.value.fullPath !== ownPath) {
      return
    }
    const value = router.options.history.state.dashboardPanel
    const entry = panels.find(panel => panel.name === value)
    expanded.value = entry?.framed ? entry.name : null
    if (expanded.value) {
      focused.value = expanded.value
    }
  }
  onMounted(syncExpanded)
  onBeforeUnmount(router.afterEach(syncExpanded))

  // 由面板小外殼上的展開按鈕呼叫
  function expand (name: string) {
    const entry = panels.find(panel => panel.name === name)
    if (!entry?.framed) {
      return
    }
    focused.value = name
    const { path, query, hash } = router.currentRoute.value
    void router.push({ path, query, hash, state: { dashboardPanel: name }, force: true })
  }

  function collapse () {
    router.back()
  }

  const focusedEntry = computed(() => panels.find(entry => entry.name === focused.value))

  // 多選的面板一定是關注面板：關注點在多選期間不移動
  const focusedSelection = computed(() => focusedEntry.value?.selection.value ?? null)
  useAppBarSelection(() => focusedSelection.value)

  // App Bar 的動作：平時沒有。關注面板多選中或已展開時，為該面板交到此處的動作
  const panelActions = relaySlot<(PageAction | null)[]>(appBarActionsKey, [])
  useAppBarActions(() => expanded.value || focusedSelection.value ? panelActions.value : [])

  // 展開時 App Bar 顯示 ← 與面板的標題
  useAppBarHeading(() => expanded.value ? { title: focusedEntry.value?.title ?? '', back: collapse } : null)

  const context: DashboardContext = {
    focused,
    focus,
    selecting,
    expanded,
    expand,
    register,
    placement: name => computed(() => placements.value.get(name)),
    cellSize: cell,
    gap: GAP,
    panelTransition,
  }
  provide(dashboardKey, context)

  // 抽屜開啟時，先停在關注面板的表
  const focusedTableLabel = computed(() => {
    const table = panels.find(entry => entry.name === focused.value)?.table
    return table ? schemas[table].tableLabel : ''
  })
  const sharedControls = provideSharedListControls(focusedTableLabel, () => interactive)

  // App Bar 的搜尋：關注面板有自己的一份時為該份，沒有時為共用的一份
  registerSlot(listControlsKey, () => focusedEntry.value?.controls.value ?? sharedControls.value, null)

  // 面板內的轉場：先為面板命名並等待 DOM 更新，舊畫面才截得到名稱。轉場進行中再有選取時直接套用
  async function transition (kind: 'fade' | 'forward' | 'back', update: () => void) {
    if (!canAnimate() || panelTransition.value) {
      update()
      return
    }
    markTransition('panel', kind === 'fade' ? null : kind)
    panelTransition.value = kind === 'fade' ? 'fade' : 'slide'
    await nextTick()

    const pending = await beginTransition()
    update()
    await nextTick()
    pending.finish()
    void pending.finished.finally(() => {
      panelTransition.value = null
    })
  }

  // 互動的選取。未開啟互動時沒有選取，詳細面板只顯示欄位名稱
  provideDashboardSelection(() => interactive, transition)

  // 展開時不排方格，展開的面板與一般頁面相同
  const gridStyle = computed(() => expanded.value
    ? {}
    : ({
      gridTemplateColumns: `repeat(${cols.value}, minmax(0, 1fr))`,
      gridAutoRows: `${Math.max(cell.value, 0)}px`,
      gap: `${GAP}px`,
    }))
</script>

<template>
  <div ref="root" class="dashboard" :class="{ 'dashboard--expanded': expanded }" :data-layout="compact ? 'mobile' : 'desktop'">
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

.dashboard--expanded {
  padding: 0;
}

.dashboard--expanded .dashboard__grid {
  display: block;
}
</style>
