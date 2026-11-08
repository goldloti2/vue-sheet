<script lang="ts" setup>
  import FieldsLayer from '@/components/ui/shell/FieldsLayer.vue'
  import FormLayer from '@/components/ui/shell/FormLayer.vue'
  import { layers } from '@/composables/shell/formLayerState'
  import { requestCloseLayer } from '@/composables/shell/useFormLayers'
</script>

<template>
  <template v-for="layer in layers" :key="layer.id">
    <!-- 返回鍵由表單層的堆疊處理，動畫由換頁動畫處理（見 docs/topics/pages.md） -->
    <v-dialog
      v-if="layer.view.kind === 'form'"
      :close-on-back="false"
      fullscreen
      :model-value="true"
      :transition="false"
      @update:model-value="requestCloseLayer"
    >
      <FormLayer :layer="layer" :view="layer.view" />
    </v-dialog>

    <FieldsLayer v-else :layer="layer" :view="layer.view" />
  </template>
</template>
