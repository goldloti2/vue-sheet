<script lang="ts" setup>
  import type { NavNode } from '../../../shared/navGroups'
  import { mdiCircleMedium } from '@mdi/js'
  import { computed } from 'vue'
  import { nodeFiles, nodeTarget } from '../../../shared/navGroups'

  const props = defineProps<{
    node: NavNode
    /** 上一層的識別值。資料夾的識別值為上一層的識別值加上 / 與名稱，各表的同名資料夾不會一起展開。須與 navFolderValues 相同 */
    parent: string
    /** 檔案的路徑或頁面的識別值 */
    currentTarget: string | null
    dirtyPaths: ReadonlySet<string>
  }>()

  const emit = defineEmits<{
    select: [target: string]
  }>()

  const value = computed(() => `${props.parent}/${props.node.label}`)
  const itemClass = computed(() => ({ 'nav-tree-node--detail': props.node.detail !== undefined }))
  const target = computed(() => nodeTarget(props.node))
  // 頁面的任一個檔案未儲存時，頁面標示未儲存
  const dirty = computed(() => target.value !== null && nodeFiles(props.node).some(path => props.dirtyPaths.has(path)))
</script>

<template>
  <v-list-group v-if="node.children" :value="value">
    <template #activator="{ props: activator }">
      <v-list-item v-bind="activator" :class="itemClass" :title="node.label">
        <span v-if="node.detail" class="nav-tree-node__detail">{{ node.detail }}</span>
      </v-list-item>
    </template>

    <NavTreeNode
      v-for="child in node.children"
      :key="nodeTarget(child) ?? child.label"
      :current-target="currentTarget"
      :dirty-paths="dirtyPaths"
      :node="child"
      :parent="value"
      @select="emit('select', $event)"
    />
  </v-list-group>

  <v-list-item
    v-else-if="target !== null"
    :active="target === currentTarget"
    :class="itemClass"
    color="primary"
    :title="node.label"
    @click="emit('select', target)"
  >
    <span v-if="node.detail" class="nav-tree-node__detail">{{ node.detail }}</span>

    <template v-if="dirty" #append>
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
