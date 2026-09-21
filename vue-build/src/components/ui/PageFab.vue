<script lang="ts" setup>
  import type { PageAction } from '@/composables/actions/useTableActions'
  import { mdiClose, mdiDotsVertical } from '@mdi/js'
  import { computed, inject, onActivated, onDeactivated, ref, shallowRef } from 'vue'
  import { useLayout } from 'vuetify'
  import { useRunAction } from '@/composables/useActionRunner'
  import { overlayOpenKey } from '@/composables/useOverlay'

  defineProps<{
    actions: PageAction[]
  }>()

  const { mainRect } = useLayout()

  // 疊在目前註冊的 app-bar/底部導覽列上方，不用寫死高度（跟 v-main 自己算 padding 用同一套機制）
  const offsetStyle = computed(() => ({ bottom: `${mainRect.value.bottom + 16}px` }))

  const open = shallowRef(false)

  // 篩選抽屜這種蓋整頁的東西開著時先讓開，FAB 的 z-index 本來就在 layout 之上
  const overlayOpen = inject(overlayOpenKey, ref(false))

  const isActive = shallowRef(true)
  onActivated(() => {
    isActive.value = true
  })
  onDeactivated(() => {
    isActive.value = false
  })

  const runAction = useRunAction()

  function handleActionClick (action: PageAction) {
    runAction(action)
    open.value = false
  }
</script>

<template>
  <Teleport to="body">
    <div v-if="isActive && !overlayOpen && actions.length > 0" class="page-fab" :style="offsetStyle">
      <template v-if="actions.length <= 2">
        <v-fab
          v-for="action in actions"
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
          <div v-for="action in actions" :key="action.key" class="fab-action">
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
