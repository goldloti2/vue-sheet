<script lang="ts" setup>
  import type { FieldsView, Layer } from '@/composables/shell/formLayerState'
  import FieldsDialog from '@/components/ui/dialog/FieldsDialog.vue'
  import { useFieldsForm } from '@/composables/shell/useAskFields'
  import { requestCloseLayer } from '@/composables/shell/useFormLayers'

  const { layer, view } = defineProps<{
    layer: Layer
    view: FieldsView
  }>()

  const { form, errors, confirmFields } = useFieldsForm(layer, view)
</script>

<template>
  <FieldsDialog
    v-model:form="form"
    :close-on-back="false"
    :errors="errors"
    :keys="view.keys"
    :lock-id="view.lockId"
    :model-value="true"
    :schema="view.schema"
    :title="view.title"
    @confirm="confirmFields"
    @update:model-value="requestCloseLayer"
  />
</template>
