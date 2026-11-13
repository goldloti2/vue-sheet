<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { mdiClose, mdiDotsVertical } from '@mdi/js'
  import { computed, onActivated, onDeactivated, shallowRef } from 'vue'
  import { useLayout } from 'vuetify'
  import { useRunAction } from '@/composables/shell/useActionRunner'
  import { useCompactLayout } from '@/composables/shell/useCompactLayout'
  import { useOverlayOpen } from '@/composables/shell/useOverlay'
  import { usePanelActive, usePanelFullPage } from '@/composables/shell/usePanelActive'

  const { actions } = defineProps<{
    actions: (PageAction | null)[]
  }>()

  const shown = computed(() => actions.filter(action => action !== null))

  // 手機版三個以上時收成一個按鈕。電腦版一律各自一個按鈕，旁邊顯示名稱（見 docs/design/README.md 的「FAB」）
  const compact = useCompactLayout()
  const collapsed = computed(() => compact.value && shown.value.length > 2)

  const { mainRect } = useLayout()

  // 位於底部導覽列上方，高度取自 Vuetify layout（與 v-main 的 padding 相同機制）。距離見 docs/design/README.md
  const offsetStyle = computed(() => ({ bottom: `${mainRect.value.bottom + 24}px` }))

  // 主色淡一階，由 plugins/vuetify.ts 的 variations 產生
  const FAB_COLOR = 'primary-lighten-1'

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
      <template v-if="!collapsed">
        <div v-for="action in shown" :key="action.key" class="fab-action">
          <span v-if="!compact" class="fab-action__label text-label-large">{{ action.label }}</span>

          <v-fab
            :aria-label="action.label"
            class="page-fab__fab"
            :color="FAB_COLOR"
            :icon="action.icon"
            size="large"
            @click="handleActionClick(action)"
          />
        </div>
      </template>

      <v-fab
        v-else
        class="page-fab__fab"
        :color="open ? 'bg-surface-light' : FAB_COLOR"
        icon
        size="large"
        @click="open = !open"
      >
        <!-- 新舊圖示同時轉換，舊的圖示離場時改為絕對定位，不推擠新的圖示 -->
        <v-fab-transition leave-absolute mode="default">
          <v-icon :key="open ? 'close' : 'menu'" :icon="open ? mdiClose : mdiDotsVertical" />
        </v-fab-transition>

        <v-speed-dial
          v-model="open"
          activator="parent"
          content-class="page-fab__menu"
          location="top center"
          scrim
          transition="slide-y-reverse-transition"
        >
          <div v-for="action in shown" :key="action.key" class="fab-action">
            <span class="fab-action__label text-label-large">{{ action.label }}</span>

            <v-btn
              :aria-label="action.label"
              class="page-fab__button"
              :color="FAB_COLOR"
              :icon="action.icon"
              size="default"
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
  right: 24px;
  z-index: 2001;
  view-transition-name: page-fab;
  display: flex;
  flex-direction: column-reverse;
  gap: 12px;
}

/* 圓角見 docs/design/README.md 的「FAB」。v-fab 的 class 位於外層，圓角套用至其中的按鈕 */
.page-fab__button,
.page-fab__fab :deep(.v-btn) {
  border-radius: 16px;
}

/* 收合時整排動作向下滑出並淡出，與展開時的滑入對稱。speed dial 收合時只套用選單本身的淡出 */
:global(.page-fab__menu.fade-transition-leave-active) {
  transition-property: opacity, transform;
}

:global(.page-fab__menu.fade-transition-leave-to) {
  transform: translateY(15px);
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
