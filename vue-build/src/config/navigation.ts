import type { AppNavItem, AppNavSection } from '@/components/ui/shell/AppShell.vue'
import { mdiHome } from '@mdi/js'

// 底部導覽列，最多 5 項
export const navItems: AppNavItem[] = [
  { title: '首頁', icon: mdiHome, to: '/' },
]

// 側邊欄的頁面，依組列出。有 title 的組可展開與收合。可與底部導覽列重複
export const drawerSections: AppNavSection[] = []
