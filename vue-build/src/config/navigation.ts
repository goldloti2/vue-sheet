import type { AppNavItem } from '@/components/ui/shell/AppShell.vue'
import { mdiHome } from '@mdi/js'

export const navItems: AppNavItem[] = [
  { title: '首頁', icon: mdiHome, to: '/' },
]
