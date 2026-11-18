<script lang="ts" setup>
  import { computed, inject, shallowRef, watch } from 'vue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { useFilesStore } from '@/stores/files'
  import { columnKeyError } from '../../../shared/schema'
  import { usedColumnKeys } from '../../../shared/schemaForm'

  const open = defineModel<boolean>({ required: true })

  const form = inject(SCHEMA_FORM_KEY)!
  const files = useFilesStore()

  const key = shallowRef('')
  const label = shallowRef('')
  const type = shallowRef('text')
  const virtual = shallowRef(false)
  const saving = shallowRef(false)

  // 開啟時清空上次的輸入
  watch(open, value => {
    if (value) {
      key.value = ''
      label.value = ''
      type.value = 'text'
      virtual.value = false
    }
  })

  const typeNames = computed(() => form.types.value?.columnTypes.map(info => info.name) ?? [])
  const keyError = computed(() => key.value === '' ? null : columnKeyError(key.value, usedColumnKeys(form.model.value)))
  const valid = computed(() => key.value !== '' && keyError.value === null && label.value.trim() !== '' && typeNames.value.includes(type.value))

  async function submit (): Promise<void> {
    if (!valid.value || saving.value) {
      return
    }
    saving.value = true
    const error = await form.apply([{
      kind: 'addColumn',
      column: { key: key.value, label: label.value.trim(), type: type.value, virtual: virtual.value },
    }], 'now')
    saving.value = false
    if (error) {
      files.message = error
    } else {
      open.value = false
    }
  }
</script>

<template>
  <v-dialog v-model="open" max-width="420">
    <v-card class="editor-compact-inputs" title="新增欄位">
      <v-card-text class="add-column-dialog__fields">
        <v-text-field
          v-model="key"
          autocomplete="off"
          autofocus
          class="add-column-dialog__key"
          density="compact"
          :error-messages="keyError ?? undefined"
          :hide-details="keyError === null"
          label="key"
          variant="outlined"
          @keydown.enter="submit"
        />

        <v-text-field
          v-model="label"
          autocomplete="off"
          density="compact"
          hide-details
          label="標籤"
          variant="outlined"
          @keydown.enter="submit"
        />

        <v-select
          v-model="type"
          density="compact"
          hide-details
          :items="typeNames"
          label="型別"
          variant="outlined"
        />

        <v-checkbox v-model="virtual" density="compact" hide-details label="虛擬欄位" />

      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="取消" @click="open = false" />

        <v-btn
          color="primary"
          :disabled="!valid"
          :loading="saving"
          text="新增"
          @click="submit"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.add-column-dialog__fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-column-dialog__key :deep(input) {
  font-family: monospace;
}
</style>
