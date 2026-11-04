<script lang="ts" setup>
  import type { DashboardContext } from '@/components/ui/panel/dashboardContext'
  import type { Link } from '@/composables/shell/useDashboardLinks'
  import type { TableKey } from '@/schema'
  import { mdiArrowExpand } from '@mdi/js'
  import { computed, inject, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
  import { AUTO_ROWS_MAX, dashboardKey } from '@/components/ui/panel/dashboardContext'
  import { relaySlot } from '@/composables/shell/useActionSlot'
  import { dashboardPanelKey } from '@/composables/shell/useDashboardLinks'
  import { listControlsKey } from '@/composables/shell/useListControls'
  import { panelActiveKey, panelBorderedKey, panelFullPageKey, usePanelActive } from '@/composables/shell/usePanelActive'
  import { appBarSelectionKey } from '@/composables/shell/useShellActions'

  // dashboard 的一個面板：小外殼、關注點，以及面板內容各項登記生效的時機（見 docs/components/panel/DashboardPanel.md）
  const { name, title, frame = true, table, selects = false, scope = null } = defineProps<{
    // 對應 DashboardPage 的 layout，也是連動中心中此面板的名稱
    name: string
    // 小外殼上的標題
    title?: string
    // 是否有小外殼。沒有時不能成為關注點
    frame?: boolean
    // 面板內容所屬的表。抽屜開啟時，先停在關注面板的這張表
    table?: TableKey
    // 點擊一列為選取，不換頁
    selects?: boolean
    // 面板內容的輸入：列表只保留其中的列，沒有條件時不限制。詳細頁在剛好一列時顯示這一列
    scope?: Link | null
  }>()

  const injected = inject(dashboardKey)
  if (!injected) {
    throw new Error('DashboardPanel 須放在 DashboardPage 之內')
  }
  // 另存一份已確定存在的值，供函數宣告（會被提升）使用
  const dashboard: DashboardContext = injected

  // 等待面板補上表的值，以面板的 table 算出列。須與面板的表相同
  function settle (link: Link | null, input: string): Link | null {
    if (link?.resolve && !table && import.meta.env.DEV) {
      console.warn(`[DashboardPanel] ${name}：${input} 中有未指定 within 的 childrenOf，面板須指定 table`)
    }
    const settled = link?.resolve ? (table ? link.resolve(table) : null) : link
    if (import.meta.env.DEV && settled?.table && table && settled.table !== table) {
      console.warn(`[DashboardPanel] ${name}：${input} 為 ${settled.table} 的列，面板的表為 ${table}`)
    }
    return settled
  }

  const scopeLink = computed(() => settle(scope, 'scope'))
  const scopeTest = computed(() => {
    const ids = scopeLink.value?.ids
    if (!ids) {
      return null
    }
    const kept = new Set(ids)
    return (row: object) => kept.has((row as { id: string }).id)
  })

  // 面板的輸入與輸出，由 ListPage、ChartPage、useListPage、useRecordPage 與詳細頁的導覽讀取
  const links = dashboard.links
  provide(dashboardPanelKey, {
    selects: () => selects,
    selected: () => links.output(name)?.selected ?? null,
    toggle: id => dashboard.transition('fade', () => links.select(name, links.output(name)?.selected === id ? null : id)),
    show: (shownTable, ids) => links.show(name, shownTable, ids),
    scope: () => scopeTest.value,
    recordId: () => {
      const ids = scopeLink.value?.ids
      return ids?.length === 1 ? ids[0]! : ''
    },
    recordOrder: () => {
      const from = scopeLink.value?.from
      return from ? links.output(from)?.shown ?? null : null
    },
    goRecord: (id, direction) => {
      const from = scopeLink.value?.from
      if (from && links.output(from)?.selected !== id) {
        dashboard.transition(direction, () => links.select(from, id))
      }
    },
  })

  // 面板內容的多選出口與搜尋先交到此處，由 DashboardPage 只取關注面板的那一份登記
  const selection = relaySlot(appBarSelectionKey, null)
  const controls = relaySlot(listControlsKey, null)

  const measuredRows = shallowRef<number | null>(null)
  onBeforeUnmount(dashboard.register({ name, title: title ?? '', framed: frame, table, measuredRows, selection, controls }))

  const active = computed(() => dashboard.focused.value === name)
  const expanded = computed(() => dashboard.expanded.value === name)
  const hidden = computed(() => dashboard.expanded.value !== null && !expanded.value)
  const placement = dashboard.placement(name)

  // 面板中的登記（usePanelActive 的使用者）只在關注面板生效，與 TabPage 的頁籤同一套機制。外層的面板（例如頁籤）也須作用中
  const outer = usePanelActive()
  provide(panelActiveKey, computed(() => active.value && outer.value))
  // FAB、DetailPage 的上一列與下一列、左右滑動，只在展開時啟用
  provide(panelFullPageKey, expanded)
  // 展開時沒有外框
  provide(panelBorderedKey, computed(() => !expanded.value))

  // 手機自動排版的高度：量測小外殼與內容的實際高度，換算為格數（最多 AUTO_ROWS_MAX）
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

  // 只在面板內的轉場進行中命名，換頁時隨整個畫面滑動。name 中不能用於 CSS 名稱的字元換成 _
  const transitionStyle = computed(() => {
    const mode = dashboard.panelTransition.value
    if (mode === 'fade') {
      return { viewTransitionName: `panel-${name.replace(/[^\w-]/g, '_')}` }
    }
    return mode === 'slide' && expanded.value ? { viewTransitionName: 'dashboard-panel-active' } : {}
  })

  // 另一個面板多選時，於捕獲階段攔下點擊與長按。不使用 inert，面板本身的捲動不受影響
  const locked = computed(() => dashboard.selecting.value !== null && dashboard.selecting.value !== name)

  // 點擊面板的任何地方，即成為關注點。於捕獲階段處理，長按進入多選前即已移到此面板
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

    <!-- 面板在自己的框內捲動，展開時隨整頁捲動 -->
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

/* 關注點以外框標示。使用 outline，不加粗 border，面板大小不變 */
.dashboard-panel--focused {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -1px;
}

/* 另一個面板多選中：稍微調暗，游標不顯示為可點擊的樣式 */
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

/* 內容依面板的寬度切換窄版（門檻見 docs/design/dashboard.md），圖表以 cqh 依高度決定大小。一般頁面沒有這個 container，不會觸發 */
.dashboard-panel__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  container: dashboard-panel / size;
}

/* 內容在面板內捲動，固定於上緣的元素（例如頁籤列）以面板的上緣為準。展開時隨整頁捲動，沿用 App Bar 的高度 */
.dashboard-panel:not(.dashboard-panel--expanded) .dashboard-panel__body {
  --v-layout-top: 0px;
}

/* 展開時與一般頁面相同：沒有外框，高度不受限，隨整頁捲動 */
.dashboard-panel--expanded {
  overflow: visible;
  border: none;
  border-radius: 0;
}

/* 高度隨內容，只保留寬度的 container */
.dashboard-panel--expanded .dashboard-panel__body {
  overflow: visible;
  container-type: inline-size;
}
</style>
