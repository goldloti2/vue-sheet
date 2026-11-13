import type { DashboardPanelContext, Link, LinksState } from '@/composables/shell/useDashboardLinks'
import type { PanelTransitionKind } from '@/composables/shell/viewTransition'
import type { TableKey } from '@/schema'
import { computed } from 'vue'

// 一份接線：面板或頁籤的表與輸入（見 docs/components/panel/DashboardPanel.md）
export interface PanelWiring {
  table?: TableKey
  selects?: boolean
  scope?: Link | null
  mark?: Link | null
}

export interface PanelContextOptions {
  links: LinksState
  transition: (kind: PanelTransitionKind, update: () => void) => void
  // 輸出的名稱：面板為面板的 name，頁籤為「面板/頁籤」。警告中也以此稱呼
  name: string
  wiring: () => PanelWiring
  shared: () => boolean
  // 各自接線的頁籤：頁籤的名稱 → 該頁籤的接線。沒有時為 undefined
  tabs?: () => Record<string, PanelWiring> | undefined
}

// 面板與頁籤共用的接線：解析輸入，並將輸出寫入連動中心。設了 tabs 時，本身沒有輸入與輸出，只保留 table
export function createPanelContext (options: PanelContextOptions): DashboardPanelContext {
  const { links, transition, name, wiring, shared, tabs } = options

  const outputs = () => !tabs?.()
  const input = (): PanelWiring => outputs() ? wiring() : { table: wiring().table }

  // 等待面板補上表的值，以接線的 table 算出列。須與接線的表相同
  function settle (link: Link | null, kind: string): Link | null {
    const table = input().table
    if (link?.resolve && !table && import.meta.env.DEV) {
      console.warn(`[DashboardPanel] ${name}：${kind} 中有未指定 within 的 childrenOf，須指定 table`)
    }
    const settled = link?.resolve ? (table ? link.resolve(table) : null) : link
    if (import.meta.env.DEV && settled?.table && table && settled.table !== table) {
      console.warn(`[DashboardPanel] ${name}：${kind} 為 ${settled.table} 的列，接線的表為 ${table}`)
    }
    return settled
  }

  const scopeLink = computed(() => settle(input().scope ?? null, 'scope'))
  const scopeTest = computed(() => {
    const ids = scopeLink.value?.ids
    if (!ids) {
      return null
    }
    const kept = new Set(ids)
    return (row: object) => kept.has((row as { id: string }).id)
  })
  // 沒有條件時不標示任何列
  const markedIds = computed(() => new Set(settle(input().mark ?? null, 'mark')?.ids))

  // 頁籤的接線未指定 table 時，沿用此處的 table
  function forTab (tab: string): DashboardPanelContext | null {
    const own = tabs?.()
    if (!own || !(tab in own)) {
      return null
    }
    return createPanelContext({
      links,
      transition,
      name: `${name}/${tab}`,
      wiring: () => ({ table: wiring().table, ...tabs?.()?.[tab] }),
      shared,
    })
  }

  return {
    shared,
    selects: () => outputs() && (input().selects ?? false),
    selected: () => outputs() ? links.output(name)?.selected ?? null : null,
    toggle: id => {
      if (outputs()) {
        transition('fade', () => links.select(name, links.output(name)?.selected === id ? null : id))
      }
    },
    show: (shownTable, ids) => {
      if (outputs()) {
        links.show(name, shownTable, ids)
      }
    },
    scope: () => scopeTest.value,
    marked: id => markedIds.value.has(id),
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
        transition(direction, () => links.select(from, id))
      }
    },
    forTab,
  }
}
