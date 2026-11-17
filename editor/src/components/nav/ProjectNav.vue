<script lang="ts" setup>
  import { computed } from 'vue'
  import { navGroups } from '../../../shared/navGroups'
  import NavTreeNode from './NavTreeNode.vue'

  const props = defineProps<{
    paths: readonly string[]
    tableLabels: Readonly<Record<string, string>>
    currentPath: string | null
    dirtyPaths: ReadonlySet<string>
  }>()

  const emit = defineEmits<{
    select: [path: string]
  }>()

  const groups = computed(() => navGroups(props.paths, props.tableLabels))
</script>

<template>
  <nav class="project-nav">
    <!-- 同一層只展開一項，各組預設收合 -->
    <v-list class="py-0" density="compact" nav open-strategy="single">
      <NavTreeNode
        v-for="group in groups"
        :key="group.label"
        :current-path="currentPath"
        :depth="0"
        :dirty-paths="dirtyPaths"
        :node="group"
        parent=""
        @select="emit('select', $event)"
      />
    </v-list>
  </nav>
</template>

<style scoped>
.project-nav {
  overflow-y: auto;
}

/* 每一項之間以格線分開，項目不留間距與圓角 */
.project-nav :deep(.v-list) {
  padding-inline: 0;
}

.project-nav :deep(.v-list-item) {
  margin-top: 0;
  border-radius: 0;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
