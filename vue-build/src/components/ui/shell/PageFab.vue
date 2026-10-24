<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { mdiClose, mdiDotsVertical } from '@mdi/js'
  import { computed, onActivated, onDeactivated, shallowRef } from 'vue'
  import { useLayout } from 'vuetify'
  import { useRunAction } from '@/composables/shell/useActionRunner'
  import { useOverlayOpen } from '@/composables/shell/useOverlay'
  import { usePanelActive, usePanelFullPage } from '@/composables/shell/usePanelActive'

  const { actions } = defineProps<{
    actions: (PageAction | null)[]
  }>()

  const shown = computed(() => actions.filter(action => action !== null))

  const { mainRect } = useLayout()

  // 位於底部導覽列上方，高度取自 Vuetify layout（與 v-main 的 padding 相同機制）
  const offsetStyle = computed(() => ({ bottom: `${mainRect.value.bottom + 16}px` }))

  const open = shallowRef(false)

  // 篩選抽屜等覆蓋整頁的元件開啟時隱藏。FAB 的 z-index 高於 layout
  const overlayOpen = useOverlayOpen()

  // 只在頁面為作用中、所在頁籤為目前頁籤、dashboard 面板已展開時顯示
  const cached = shallowRef(true)
  const panelActive = usePanelActive()
  const fullPage = usePanelFullPage()
  const isActive = computed(() => cached.value && panelActive.value && fullPage.value)

  onActivated(() => {
    cached.value = true
  })
  onDeactivated(() => {
    cached.value = false
  })

  const runAction = useRunAction()

  function handleActionClick (action: PageAction) {
    runAction(action)
    open.value = false
  }
</script>

<template>
  <Teleport to="body">
    <div v-if="isActive && !overlayOpen && shown.length > 0" class="page-fab" :style="offsetStyle">
      <template v-if="shown.length <= 2">
        <v-fab
          v-for="action in shown"
          :key="action.key"
          :aria-label="action.label"
          color="primary"
          :icon="action.icon"
          rounded
          size="default"
          @click="handleActionClick(action)"
        />
      </template>

      <v-fab
        v-else
        :color="open ? 'bg-surface-light' : 'primary'"
        icon
        rounded="lg"
        size="default"
        @click="open = !open"
      >
        <v-fab-transition mode="out-in">
          <v-icon :key="open ? 'close' : 'menu'" :icon="open ? mdiClose : mdiDotsVertical" />
        </v-fab-transition>

        <v-speed-dial
          v-model="open"
          activator="parent"
          location="top center"
          scrim
          transition="slide-y-reverse-transition"
        >
          <div v-for="action in shown" :key="action.key" class="fab-action">
            <span class="fab-action__label text-label-large">{{ action.label }}</span>

            <v-btn
              :aria-label="action.label"
              color="primary"
              :icon="action.icon"
              rounded
              size="small"
              @click="handleActionClick(action)"
            />
          </div>
        </v-speed-dial>
      </v-fab>
    </div>
  </Teleport>
</template>

<style scoped>
.page-fab {
  position: fixed;
  right: 16px;
  z-index: 2001;
  view-transition-name: page-fab;
  display: flex;
  flex-direction: column-reverse;
  gap: 12px;
}

.fab-action {
  position: relative;
  display: flex;
  justify-content: center;
}

.fab-action__label {
  position: absolute;
  top: 50%;
  right: 100%;
  margin-right: 8px;
  padding: 4px 12px;
  border-radius: 4px;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface-variant));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  transform: translateY(-50%);
}
</style>
