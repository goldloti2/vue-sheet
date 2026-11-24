<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import PageFab from '@/components/ui/shell/PageFab.vue'
  import { useAppBarActions } from '@/composables/shell/useShellActions'

  // 頁面的動作：右下角的 FAB 與 App Bar 右側的動作。供 ListPage、DetailPage、ChartPage 使用
  const props = defineProps<{
    fab?: (PageAction | null)[]
    appBar?: (PageAction | null)[]
  }>()

  // App Bar 的動作只有一份，後登記的取代先登記的。沒有提供時不登記
  if (props.appBar) {
    useAppBarActions(() => props.appBar ?? [])
  }
</script>

<template>
  <PageFab :actions="fab ?? []" />
</template>
