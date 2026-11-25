<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import type { ChildBlock } from '@/composables/page/childBlock'
  import { computed } from 'vue'
  import CountLabel from '@/components/ui/list/CountLabel.vue'
  import ListLayout from '@/components/ui/list/ListLayout.vue'
  import { useRunAction } from '@/composables/shell/useActionRunner'

  // 子表區塊的外觀：標題與列數、子列、沒有子列時的文字與按鈕。由 ListPage 於區塊中使用
  const props = defineProps<{
    block: ChildBlock
    // 全部的子列數，不只是顯示的子列
    count: number
    // 排在「展開」旁的按鈕，即展開頁的 FAB
    actions?: (PageAction | null)[]
    layout: 'list' | 'grid'
  }>()

  const shownActions = computed(() => (props.actions ?? []).filter(action => action !== null))

  const runAction = useRunAction()
</script>

<template>
  <!-- 子列與列表頁相同，貼齊畫面的左右，留白由內容決定（見 ListLayout）。標題、說明與按鈕留白 -->
  <v-container v-if="count > 0 || !block.hideEmpty" class="child-block">
    <div class="child-block__inset text-title-medium font-weight-bold mb-2">
      <CountLabel :count="count" :label="block.title" />
    </div>

    <ListLayout v-if="count > 0" :layout="layout">
      <slot />
    </ListLayout>

    <div v-else class="child-block__inset text-medium-emphasis">{{ block.emptyText }}</div>

    <div v-if="block.to || shownActions.length > 0" class="child-block__inset d-flex flex-wrap ga-2 justify-end mt-2">
      <v-btn v-if="block.to" text="展開" :to="block.to" variant="text" />

      <v-btn
        v-for="action in shownActions"
        :key="action.key"
        :text="action.label"
        variant="text"
        @click="runAction(action)"
      />
    </div>
  </v-container>
</template>

<style scoped>
.child-block {
  padding-inline: 0;
}

.child-block__inset {
  padding-inline: 16px;
}
</style>
