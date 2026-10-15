<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { TableKey } from '@/schema'
  import { computed, inject, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
  import { AUTO_ROWS_MAX, dashboardKey } from '@/components/ui/panel/dashboardContext'
  import { panelActiveKey, panelFabKey } from '@/composables/shell/usePanelActive'
  import { appBarActionsKey, appBarSelectionKey } from '@/composables/shell/useShellActions'

  // dashboard 的一個面板（見 docs/dashboard.md）：小外殼、關注點，以及控制面板內容的各項登記何時生效
  const { name, title, frame = true, table } = defineProps<{
    // 對應 DashboardPage 的 layout
    name: string
    // 小外殼上的標題
    title?: string
    // 是否有小外殼；沒有時不能成為關注點
    frame?: boolean
    // 面板內容所屬的表，抽屜打開時先停在關注面板的這張表
    table?: TableKey
  }>()

  const dashboard = inject(dashboardKey)
  if (!dashboard) {
    throw new Error('DashboardPanel 須放在 DashboardPage 之內')
  }

  const measuredRows = shallowRef<number | null>(null)
  const selecting = shallowRef(false)
  onBeforeUnmount(dashboard.register({ name, framed: frame, table, measuredRows, selecting }))

  const active = computed(() => dashboard.focused.value === name)
  const placement = dashboard.placement(name)

  // 面板中的登記（usePanelActive 的使用者）只在關注面板生效，與 TabPage 的頁籤同一套機制
  provide(panelActiveKey, active)
  // FAB 僅於展開時出現（展開尚未實作）
  provide(panelFabKey, computed(() => false))

  // App Bar 的動作只在此面板多選時出現：攔下面板內容的登記，平時改交出空的
  const setAppBarActions = inject(appBarActionsKey, null)
  const setSelection = inject(appBarSelectionKey, null)
  let latestActions: (PageAction | null)[] = []
  const actionsShown = computed(() => selecting.value)

  provide(appBarActionsKey, actions => {
    latestActions = actions
    setAppBarActions?.(actionsShown.value ? actions : [])
  })

  provide(appBarSelectionKey, cancel => {
    selecting.value = cancel !== null
    setSelection?.(cancel)
  })

  watch(actionsShown, shown => {
    if (active.value) {
      setAppBarActions?.(shown ? latestActions : [])
    }
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

  const placementStyle = computed(() => placement.value
    ? {
      gridColumn: `${placement.value.x} / span ${placement.value.w}`,
      gridRow: `${placement.value.y} / span ${placement.value.h}`,
    }
    : {})
</script>

<template>
  <!-- 點擊面板的任何地方即成為關注點（capture，長按進入多選前即已移到此面板） -->
  <section
    class="dashboard-panel"
    :class="{ 'dashboard-panel--focused': active && frame }"
    :style="placementStyle"
    @pointerdown.capture="dashboard.focus(name)"
  >
    <header v-if="frame" ref="header" class="dashboard-panel__header text-title-small">{{ title }}</header>

    <!-- 面板在自己的框內捲動 -->
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

.dashboard-panel__header {
  flex: none;
  padding: 8px 12px;
  background-color: rgb(var(--v-theme-surface-light));
}

.dashboard-panel__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
