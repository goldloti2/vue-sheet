<script lang="ts" setup>
  import { computed, shallowRef, watch } from 'vue'
  import { useTableFiles } from '@/composables/useTableFiles'
  import { useFilesStore } from '@/stores/files'
  import { idPrefixError, tableKeyError } from '../../../shared/tableFiles'
  import { tableKeyOf } from '../../../shared/tableKeys'

  const open = defineModel<boolean>({ required: true })

  const files = useFilesStore()
  const tables = useTableFiles()

  const label = shallowRef('')
  const key = shallowRef('')
  const prefix = shallowRef('')
  const saving = shallowRef(false)

  // 開啟時清空上次的輸入
  watch(open, value => {
    if (value) {
      label.value = ''
      key.value = ''
      prefix.value = ''
    }
  })

  const existing = computed(() => [...files.tableOrder, ...files.paths.map(path => tableKeyOf(path)).filter(item => item !== null)])
  const keyError = computed(() => key.value === '' ? null : tableKeyError(key.value, existing.value))
  const prefixError = computed(() => prefix.value === '' ? null : idPrefixError(prefix.value))
  const valid = computed(() => label.value.trim() !== '' && key.value !== '' && keyError.value === null && prefix.value !== '' && prefixError.value === null)

  async function submit (): Promise<void> {
    if (!valid.value || saving.value) {
      return
    }
    saving.value = true
    const created = await tables.create(key.value, label.value.trim(), prefix.value)
    saving.value = false
    if (created) {
      open.value = false
    }
  }
</script>

<template>
  <v-dialog v-model="open" max-width="420">
    <v-card class="editor-compact-inputs" title="新增表">
      <v-card-text class="new-table-dialog__fields">
        <v-text-field
          v-model="label"
          autocomplete="off"
          autofocus
          density="compact"
          hide-details
          label="表名"
          variant="outlined"
          @keydown.enter="submit"
        />

        <v-text-field
          v-model="key"
          autocomplete="off"
          class="new-table-dialog__code"
          density="compact"
          :error-messages="keyError ?? undefined"
          :hide-details="keyError === null"
          label="代號"
          variant="outlined"
          @keydown.enter="submit"
        />

        <v-text-field
          v-model="prefix"
          autocomplete="off"
          class="new-table-dialog__code"
          density="compact"
          :error-messages="prefixError ?? undefined"
          :hide-details="prefixError === null"
          label="主鍵字首"
          variant="outlined"
          @keydown.enter="submit"
        />

        <div class="text-caption text-medium-emphasis">
          <p>代號用於檔名、網址與程式，建立後無法在編輯器中修改。</p>
          <p>新表只有主鍵與名稱兩個欄位，並建立 schema、動作與本地測試的 CSV。頁面不會建立。</p>
          <p>建立後立即寫入。Config.gs 的登記請自行加入。</p>
        </div>
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
.new-table-dialog__fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.new-table-dialog__code :deep(input) {
  font-family: monospace;
}
</style>
