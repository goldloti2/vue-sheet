<script lang="ts" setup>
  import { mdiMagnify } from '@mdi/js'
  import { computed, shallowRef } from 'vue'
  import { useMdiIcons } from '@/composables/useMdiIcons'

  const props = defineProps<{
    /** 目前的原文，例如 mdiStar。沒有設定時為 null */
    code: string | null
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    /** 圖示的變數名，例如 mdiStar。null 為刪除此設定 */
    select: [name: string | null]
  }>()

  // 每一行的圖示數與高度
  const PER_ROW = 8
  const ROW_HEIGHT = 40

  const icons = useMdiIcons()
  const open = shallowRef(false)
  const query = shallowRef('')

  const current = computed(() => props.code && /^mdi\w+$/.test(props.code) ? icons.value?.[props.code] ?? null : null)

  // 以英文名稱搜尋，忽略大小寫、空白與連字號。多個詞須全部符合
  const rows = computed(() => {
    const words = query.value.toLowerCase().split(/[\s-]+/).filter(Boolean)
    const names = Object.keys(icons.value ?? {}).filter(name => {
      const plain = name.slice(3).toLowerCase()
      return words.every(word => plain.includes(word))
    })
    return Array.from({ length: Math.ceil(names.length / PER_ROW) }, (_, index) => names.slice(index * PER_ROW, (index + 1) * PER_ROW))
  })

  function select (name: string | null): void {
    open.value = false
    emit('select', name)
  }
</script>

<template>
  <v-menu
    v-model="open"
    :close-on-content-click="false"
    :disabled="disabled"
    location="bottom start"
  >
    <template #activator="{ props: activator }">
      <button
        v-bind="activator"
        class="icon-field"
        :disabled="disabled"
        type="button"
      >
        <v-icon v-if="current" :icon="current" size="18" />
        <span v-if="code" class="icon-field__name">{{ code }}</span>
        <span v-else class="text-disabled">—</span>
      </button>
    </template>

    <v-card class="editor-compact-inputs icon-field__picker">
      <div class="icon-field__search">
        <v-text-field
          v-model="query"
          autocomplete="off"
          autofocus
          density="compact"
          hide-details
          :prepend-inner-icon="mdiMagnify"
          variant="outlined"
        />

        <v-btn :disabled="!code" text="清除" variant="outlined" @click="select(null)" />
      </div>

      <div v-if="!icons" class="icon-field__message text-medium-emphasis">載入中</div>
      <div v-else-if="rows.length === 0" class="icon-field__message text-medium-emphasis">沒有符合的圖示</div>

      <v-virtual-scroll v-else height="320" :item-height="ROW_HEIGHT" :items="rows">
        <template #default="{ item: row }">
          <div class="icon-field__row">
            <button
              v-for="name in row"
              :key="name"
              :aria-label="name"
              class="icon-field__icon"
              :class="{ 'icon-field__icon--selected': name === code }"
              :title="name"
              type="button"
              @click="select(name)"
            >
              <v-icon :icon="icons[name]!" size="22" />
            </button>
          </div>
        </template>
      </v-virtual-scroll>
    </v-card>
  </v-menu>
</template>

<style scoped>
/* 外框與 outlined 的文字輸入框相同 */
.icon-field {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: thin solid rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
}

.icon-field__name {
  overflow: hidden;
  font-family: monospace;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-field__picker {
  width: 352px;
}

.icon-field__search {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
}

.icon-field__message {
  padding: 16px;
}

.icon-field__row {
  display: flex;
  height: 40px;
  padding: 0 8px;
}

.icon-field__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
}

.icon-field__icon:hover {
  background: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}

.icon-field__icon--selected {
  background: rgba(var(--v-theme-primary), var(--v-activated-opacity));
}
</style>
