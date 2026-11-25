<script lang="ts" setup>
  import type { ChildBlockOptions } from '@/composables/page/childBlock'
  import { provideChildBlock } from '@/composables/page/childBlock'

  // 詳細頁的子表區塊。內容為一個展開頁，由其中的 ListPage 以區塊呈現
  const props = withDefaults(defineProps<ChildBlockOptions>(), {
    limit: 5,
    emptyText: '還沒有資料',
  })

  provideChildBlock(props)
</script>

<template>
  <slot />
</template>
