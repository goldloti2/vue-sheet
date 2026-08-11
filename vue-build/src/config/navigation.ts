import type { AppNavItem } from '@/components/ui/AppShell.vue'
import { mdiHome } from '@mdi/js'

export const navItems: AppNavItem[] = [
  { title: '首頁', icon: mdiHome, to: '/' },
]
