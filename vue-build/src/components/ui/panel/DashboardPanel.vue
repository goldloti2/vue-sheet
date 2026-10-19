<script lang="ts" setup>
  import type { DashboardContext } from '@/components/ui/panel/dashboardContext'
  import type { TableKey } from '@/schema'
  import { mdiArrowExpand } from '@mdi/js'
  import { computed, inject, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
  import { AUTO_ROWS_MAX, dashboardKey } from '@/components/ui/panel/dashboardContext'
  import { dashboardViaKey } from '@/composables/shell/useDashboardSelection'
  import { panelActiveKey, panelFullPageKey } from '@/composables/shell/usePanelActive'
  import { appBarSelectionKey } from '@/composables/shell/useShellActions'
  import { relations } from '@/schema/relations'

  // dashboard 的一個面板（見 docs/components/panel/DashboardPanel.md）：小外殼、關注點，以及控制面板內容的各項登記何時生效
  const { name, title, frame = true, table, via } = defineProps<{
    // 對應 DashboardPage 的 layout
    name: string
    // 小外殼上的標題
    title?: string
    // 是否有小外殼；沒有時不能成為關注點
    frame?: boolean
    // 面板內容所屬的表，抽屜打開時先停在關注面板的這張表
    table?: TableKey
    // 互動經由哪個 ref 欄位連動：子表的列表為自己的欄位，父表的詳細面板為子表的欄位。不給時用全部（詳細面板取第一個）
    via?: string
  }>()

  const injected = inject(dashboardKey)
  if (!injected) {
    throw new Error('DashboardPanel 須放在 DashboardPage 之內')
  }
  // 另存一份已確定存在的，函式宣告（會被提升）中才不必再判斷
  const dashboard: DashboardContext = injected

  provide(dashboardViaKey, via)
  if (import.meta.env.DEV && via && !relations.some(relation => relation.column === via)) {
    console.warn(`[DashboardPanel] 面板 ${name} 的 via "${via}" 不是任何一張表的 ref 欄位`)
  }

  const measuredRows = shallowRef<number | null>(null)
  const selecting = shallowRef(false)
  onBeforeUnmount(dashboard.register({ name, title: title ?? '', framed: frame, table, measuredRows, selecting }))

  const active = computed(() => dashboard.focused.value === name)
  const expanded = computed(() => dashboard.expanded.value === name)
  const hidden = computed(() => dashboard.expanded.value !== null && !expanded.value)
  const placement = dashboard.placement(name)

  // 面板中的登記（usePanelActive 的使用者）只在關注面板生效，與 TabPage 的頁籤同一套機制
  provide(panelActiveKey, active)
  // FAB、DetailPage 的上下一筆與左右滑動僅於展開時啟用
  provide(panelFullPageKey, expanded)

  // App Bar 該顯示什麼由 DashboardPage 決定（見其 appBarActions）；此處只記下面板是否在多選
  const setSelection = inject(appBarSelectionKey, null)
  provide(appBarSelectionKey, cancel => {
    selecting.value = cancel !== null
    setSelection?.(cancel)
  })

  // 手機自動排版的高度：量測小外殼與內容的實際高度，換算成格數（最多 8 格）
  const header = useTemplateRef('header')
  const content = useTemplateRef('content')
  const naturalHeight = shallowRef(0)
  const observer = new ResizeObserver(() => {
    naturalHeight.value = (header.value?.offsetHeight ?? 0) + (content.value?.offsetHeight ?? 0)
  })
  onMounted(() => {
    for (const element of [header.value, content.value]) {
      if (element) {
        observer.observe(element)
      }
    }
  })
  onBeforeUnmount(() => observer.disconnect())

  watch([naturalHeight, dashboard.cellSize], ([height, cell]) => {
    if (cell <= 0) {
      return
    }
    const rows = Math.ceil((height + dashboard.gap) / (cell + dashboard.gap))
    measuredRows.value = Math.min(Math.max(rows, 1), AUTO_ROWS_MAX)
  })

  // 展開時不受方格限制，與一般頁面一樣隨整頁捲動
  const placementStyle = computed(() => placement.value && !expanded.value
    ? {
      gridColumn: `${placement.value.x} / span ${placement.value.w}`,
      gridRow: `${placement.value.y} / span ${placement.value.h}`,
    }
    : {})

  // 面板內的轉場進行中才命名，平時不命名，換頁時才會隨整個畫面一起滑動（name 中不能用於 CSS 名稱的字元換成 _）
  const transitionStyle = computed(() => {
    const mode = dashboard.panelTransition.value
    if (mode === 'fade') {
      return { viewTransitionName: `panel-${name.replace(/[^\w-]/g, '_')}` }
    }
    return mode === 'slide' && expanded.value ? { viewTransitionName: 'dashboard-panel-active' } : {}
  })

  // 另一個面板在多選時，此面板視為不存在：於捕獲階段攔下點擊與長按（不用 inert，面板自己的捲動才不受影響）
  const locked = computed(() => dashboard.selecting.value !== null && dashboard.selecting.value !== name)

  // 點擊面板的任何地方即成為關注點（捕獲階段，長按進入多選前即已移到此面板）
  function onPointerdown (event: PointerEvent) {
    if (locked.value) {
      event.stopPropagation()
    } else {
      dashboard.focus(name)
    }
  }

  function onClick (event: MouseEvent) {
    if (locked.value) {
      event.stopPropagation()
      event.preventDefault()
    }
  }
</script>

<template>
  <section
    v-show="!hidden"
    :aria-disabled="locked || undefined"
    class="dashboard-panel"
    :class="{
      'dashboard-panel--focused': active && frame && !expanded,
      'dashboard-panel--expanded': expanded,
      'dashboard-panel--locked': locked,
    }"
    :style="[placementStyle, transitionStyle]"
    @click.capture="onClick"
    @pointerdown.capture="onPointerdown"
  >
    <!-- 展開時標題改顯示於 App Bar -->
    <header v-if="frame" v-show="!expanded" ref="header" class="dashboard-panel__header">
      <span class="dashboard-panel__title text-title-small">{{ title }}</span>

      <!-- 原生 button 而非 v-btn，與 ViewActions 相同 -->
      <button aria-label="展開" class="dashboard-panel__expand" type="button" @click="dashboard.expand(name)">
        <v-icon :icon="mdiArrowExpand" size="18" />
      </button>
    </header>

    <!-- 面板在自己的框內捲動；展開時隨整頁捲動 -->
    <div class="dashboard-panel__body">
      <div ref="content">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.dashboard-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background-color: rgb(var(--v-theme-surface));
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

/* 關注點以外框標示；用 outline 而非加粗 border，面板大小不變 */
.dashboard-panel--focused {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -1px;
}

/* 另一個面板多選中：稍微調暗，游標不顯示為可點擊 */
.dashboard-panel {
  transition: opacity 0.2s;
}

.dashboard-panel--locked {
  opacity: 0.5;
}

.dashboard-panel--locked :deep(*) {
  cursor: default;
}

.dashboard-panel__header {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
  padding: 4px 4px 4px 12px;
  background-color: rgb(var(--v-theme-surface-light));
}

.dashboard-panel__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-panel__expand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 14px;
}

/* 內容依面板的寬度切換窄版（見 docs/components/panel/DashboardPanel.md）；一般頁面沒有這個 container，不會觸發 */
.dashboard-panel__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  container: dashboard-panel / inline-size;
}

/* 展開時與一般頁面相同：沒有外框，高度不受限，隨整頁捲動 */
.dashboard-panel--expanded {
  overflow: visible;
  border: none;
  border-radius: 0;
}

.dashboard-panel--expanded .dashboard-panel__body {
  overflow: visible;
}
</style>
