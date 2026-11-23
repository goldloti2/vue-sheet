<script lang="ts" setup>
  import { computed } from 'vue'
  import CountLabel from '@/components/ui/list/CountLabel.vue'

  // 分組的列表最上方的全展開列，外觀與分組列相同。展開時顯示 slot，即平鋪的全部的列
  const flat = defineModel<boolean>({ required: true })

  defineProps<{
    // 全部的列數
    count: number
  }>()

  const VALUE = 'all'
  const opened = computed({
    get: () => flat.value ? [VALUE] : [],
    set: value => {
      flat.value = value.includes(VALUE)
    },
  })
</script>

<template>
  <!-- items-registration="props" 使收合時不渲染平鋪的列 -->
  <v-list v-model:opened="opened" class="grouped-list" items-registration="props">
    <v-list-group :value="VALUE">
      <template #activator="{ props: activatorProps }">
        <v-list-item v-bind="activatorProps" class="bg-surface-light">
          <template #title>
            <CountLabel :count="count" label="全部" />
          </template>
        </v-list-item>
      </template>

      <slot />
    </v-list-group>
  </v-list>
</template>
