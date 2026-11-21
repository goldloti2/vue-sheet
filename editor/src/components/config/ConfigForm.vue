<script lang="ts" setup>
  import type { ConfigEdit } from '../../../shared/configGs'
  import { editConfig, parseConfigText } from '@/api'
  import { useParsedForm } from '@/composables/useParsedForm'
  import ConfigTables from './ConfigTables.vue'

  const props = defineProps<{
    path: string
    text: string
  }>()

  const form = useParsedForm({
    path: () => props.path,
    text: () => props.text,
    parse: parseConfigText,
    edit: (text, edits: ConfigEdit[]) => editConfig({ text, edits }),
  })

  function apply (edits: ConfigEdit[]): void {
    void form.apply(edits)
  }
</script>

<template>
  <div class="config-form editor-compact-inputs">
    <div v-if="form.model.value === undefined" class="config-form__message text-medium-emphasis">讀取中</div>

    <div v-else-if="form.model.value === null" class="config-form__message text-medium-emphasis">
      無法讀取 Config.gs，請以其他編輯器修改
    </div>

    <ConfigTables v-else :tables="form.model.value.tables" @edit="apply" />
  </div>
</template>

<style scoped>
.config-form {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.config-form__message {
  padding: 16px;
}
</style>
