<script lang="ts" setup>
  import type { NavNode } from '../../../shared/navGroups'
  import { mdiCircleMedium } from '@mdi/js'
  import { computed } from 'vue'

  const props = defineProps<{
    node: NavNode
    /** 上一層的識別值，最上層的組為空字串。資料夾的識別值為上一層的識別值加上名稱，各表的同名資料夾不會一起展開 */
    parent: string
    /** 最上層的組為 0 */
    depth: number
    currentPath: string | null
    dirtyPaths: ReadonlySet<string>
  }>()

  const emit = defineEmits<{
    select: [path: string]
  }>()

  const value = computed(() => `${props.parent}/${props.node.label}`)
  const isGroup = computed(() => props.depth === 0)
  const itemClass = computed(() => ({ 'nav-tree-node--detail': props.node.detail !== undefined }))
  // 最上層的組不顯示展開與收合的箭頭，其他資料夾顯示。undefined 為 Vuetify 預設的箭頭
  const toggleIcon = computed(() => isGroup.value ? '' : undefined)
</script>

<template>
  <v-list-group
    v-if="node.children"
    :collapse-icon="toggleIcon"
    :expand-icon="toggleIcon"
    :value="value"
  >
    <template #activator="{ props: activator }">
      <v-list-item v-bind="activator" :class="itemClass" :title="node.label">
        <template v-if="isGroup" #title>
          <span class="text-title-medium">{{ node.label }}</span>
        </template>

        <span v-if="node.detail" class="nav-tree-node__detail">{{ node.detail }}</span>
      </v-list-item>
    </template>

    <NavTreeNode
      v-for="child in node.children"
      :key="child.path ?? child.label"
      :current-path="currentPath"
      :depth="depth + 1"
      :dirty-paths="dirtyPaths"
      :node="child"
      :parent="value"
      @select="emit('select', $event)"
    />
  </v-list-group>

  <v-list-item
    v-else-if="node.path"
    :active="node.path === currentPath"
    :class="itemClass"
    color="primary"
    :title="node.label"
    @click="emit('select', node.path)"
  >
    <template v-if="isGroup" #title>
      <span class="text-title-medium">{{ node.label }}</span>
    </template>

    <span v-if="node.detail" class="nav-tree-node__detail">{{ node.detail }}</span>

    <template v-if="dirtyPaths.has(node.path)" #append>
      <v-icon aria-label="未儲存" :icon="mdiCircleMedium" />
    </template>
  </v-list-item>
</template>

<style scoped>
/* 代號的左緣對齊項目的中心線，名稱只用到中心線之前 */
.nav-tree-node--detail {
  container-type: inline-size;
}

.nav-tree-node--detail :deep(.v-list-item-title) {
  max-width: calc(50cqi - 16px - var(--indent-padding, 0px) - 4px);
}

.nav-tree-node__detail {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(-50%);
  max-width: calc(50% - 32px);
  overflow: hidden;
  font-size: 0.6875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
