<script lang="ts" setup>
  import { mdiApplicationOutline, mdiDatabaseOutline, mdiFlaskOutline, mdiGestureTapButton, mdiPlus, mdiRouterNetwork, mdiScriptTextOutline } from '@mdi/js'
  import { computed, shallowRef, watch } from 'vue'
  import { useTableDialogs } from '@/composables/useTableDialogs'
  import { navFolderValues, navGroups, nodeFiles, singleFile } from '../../../shared/navGroups'
  import NavTreeNode from './NavTreeNode.vue'

  const props = defineProps<{
    paths: readonly string[]
    tableLabels: Readonly<Record<string, string>>
    tableOrder: readonly string[]
    currentPath: string | null
    dirtyPaths: ReadonlySet<string>
  }>()

  const emit = defineEmits<{
    select: [path: string]
  }>()

  const { newTableOpen } = useTableDialogs()

  // 各組在側欄的圖示
  const GROUP_ICONS: Record<string, string> = {
    表: mdiDatabaseOutline,
    動作: mdiGestureTapButton,
    頁面: mdiApplicationOutline,
    導覽: mdiRouterNetwork,
    後端: mdiScriptTextOutline,
    資料: mdiFlaskOutline,
  }

  const groups = computed(() => navGroups(props.paths, props.tableLabels, props.tableOrder).map(group => ({
    node: group,
    files: nodeFiles(group),
  })))

  function ownerOf (path: string | null) {
    return path === null ? undefined : groups.value.find(group => group.files.includes(path))
  }

  // 面板顯示的組。尚未選取時為目前的檔案所在的組，再沒有時為第一組
  const selected = shallowRef<string | null>(null)
  const shown = computed(() => groups.value.find(group => group.node.label === selected.value)
    ?? ownerOf(props.currentPath)
    ?? groups.value[0]
    ?? null)

  // 各組展開的資料夾
  const opened = shallowRef<Record<string, string[]>>({})

  // 開啟其他組的檔案時，面板切換至該組，並展開檔案所在的資料夾
  watch(() => props.currentPath, path => {
    const owner = ownerOf(path)
    if (!owner || path === null) {
      return
    }
    selected.value = owner.node.label
    const folders = navFolderValues(owner.node, path)
    if (folders && folders.length > 0) {
      opened.value = { ...opened.value, [owner.node.label]: folders }
    }
  })

  function setOpened (label: string, values: unknown): void {
    opened.value = { ...opened.value, [label]: values as string[] }
  }

  // 組只有一個檔案時，一併開啟該檔案
  function selectGroup (label: string): void {
    selected.value = label
    const group = groups.value.find(item => item.node.label === label)
    const file = group ? singleFile(group.node) : null
    if (file !== null) {
      emit('select', file)
    }
  }

  function isDirty (files: readonly string[]): boolean {
    return files.some(file => props.dirtyPaths.has(file))
  }
</script>

<template>
  <nav class="project-nav">
    <!-- 左邊只有各組的圖示，名稱以提示顯示 -->
    <!-- 所選的組以主色標示，其他組為淡色 -->
    <div class="project-nav__rail">
      <v-btn
        v-for="group in groups"
        :key="group.node.label"
        :active="group === shown"
        :aria-label="group.node.label"
        class="project-nav__group"
        :class="{ 'project-nav__group--inactive': group !== shown }"
        :color="group === shown ? 'primary' : undefined"
        variant="text"
        @click="selectGroup(group.node.label)"
      >
        <!-- 組中有未儲存的檔案時，圖示加上圓點 -->
        <v-badge color="primary" dot :model-value="isDirty(group.files)">
          <v-icon :icon="GROUP_ICONS[group.node.label]" size="24" />
        </v-badge>

        <v-tooltip activator="parent" location="end" :text="group.node.label" />
      </v-btn>
    </div>

    <!-- 右邊列出所選的組。組名固定於最上方，只有清單捲動 -->
    <div v-if="shown" class="project-nav__panel">
      <!-- 表的組可以新增表 -->
      <div class="project-nav__header">
        <span class="text-title-medium">{{ shown.node.label }}</span>
        <v-spacer />

        <v-btn
          v-if="shown.node.label === '表'"
          aria-label="新增表"
          icon
          size="small"
          variant="text"
          @click="newTableOpen = true"
        >
          <v-icon :icon="mdiPlus" />
          <v-tooltip activator="parent" location="bottom" text="新增表" />
        </v-btn>
      </div>

      <!-- 各組的清單皆保留，切換組時維持展開的資料夾。同一層只展開一項 -->
      <v-list
        v-for="group in groups"
        v-show="group === shown"
        :key="group.node.label"
        class="project-nav__list py-0"
        density="compact"
        nav
        open-strategy="single"
        :opened="opened[group.node.label] ?? []"
        @update:opened="setOpened(group.node.label, $event)"
      >
        <NavTreeNode
          v-for="child in group.node.children"
          :key="child.path ?? child.label"
          :current-path="currentPath"
          :dirty-paths="dirtyPaths"
          :node="child"
          :parent="group.node.label"
          @select="emit('select', $event)"
        />
      </v-list>
    </div>
  </nav>
</template>

<style scoped>
.project-nav {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  min-height: 0;
}

/* 各組的按鈕為正方形，置於側欄的中央 */
.project-nav__rail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding-block: 8px;
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.project-nav__group.v-btn {
  min-width: 0;
  width: 40px;
  height: 40px;
  padding: 0;
}

.project-nav__group--inactive {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.project-nav__panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.project-nav__header {
  display: flex;
  flex: none;
  align-items: center;
  height: 48px;
  padding-inline: 16px 8px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.project-nav__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 每一項之間以格線分開，項目不留間距與圓角 */
.project-nav__list.v-list {
  padding-inline: 0;
}

/* 名稱的行高容得下 g、p 等字母的下緣 */
.project-nav__list :deep(.v-list-item-title) {
  line-height: 1.25rem;
}

.project-nav__list :deep(.v-list-item) {
  margin-top: 0;
  border-radius: 0;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
