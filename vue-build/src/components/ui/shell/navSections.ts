import type { AppNavItem, AppNavSection } from '@/components/ui/shell/AppShell.vue'

// 電腦版側邊欄的組：底部導覽列的頁面為第一組，其後為側邊欄的組。已在第一組的頁面不再列出，沒有頁面的組不列出
export function desktopSections (navItems: AppNavItem[], drawerSections: AppNavSection[]): AppNavSection[] {
  const listed = new Set(navItems.map(item => item.to))
  const rest = drawerSections
    .map(section => ({ ...section, items: section.items.filter(item => !listed.has(item.to)) }))
    .filter(section => section.items.length > 0)
  return navItems.length > 0 ? [{ items: navItems }, ...rest] : rest
}
