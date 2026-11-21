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
  const virtual = shallowRef(false)
  const saving = shallowRef(false)

  // 開啟時清空上次的輸入
  watch(open, value => {
    if (value) {
      label.value = ''
      key.value = ''
      prefix.value = ''
      virtual.value = false
      saving.value = false
    }
  })

  const existing = computed(() => [...files.tableOrder, ...files.paths.map(path => tableKeyOf(path)).filter(item => item !== null)])
  // 建立中不檢查：新表寫入後，代號已在 existing 中
  const keyError = computed(() => key.value === '' || saving.value ? null : tableKeyError(key.value, existing.value))
  const prefixError = computed(() => prefix.value === '' ? null : idPrefixError(prefix.value))
  // 虛擬表沒有主鍵字首
  const prefixValid = computed(() => virtual.value || (prefix.value !== '' && prefixError.value === null))
  const valid = computed(() => label.value.trim() !== '' && key.value !== '' && keyError.value === null && prefixValid.value)

  async function submit (): Promise<void> {
    if (!valid.value || saving.value) {
      return
    }
    saving.value = true
    const created = await tables.create(key.value, label.value.trim(), virtual.value ? '' : prefix.value, virtual.value)
    // 建立成功時維持建立中直到關閉，小視窗淡出時內容不變
    if (created) {
      open.value = false
    } else {
      saving.value = false
    }
  }
</script>

<template>
  <v-dialog v-model="open" max-width="420" :persistent="saving">
    <v-card class="editor-compact-inputs" title="新增表">
      <v-card-text class="new-table-dialog__fields">
        <v-text-field
          v-model="label"
          autocomplete="off"
          autofocus
          density="compact"
          :disabled="saving"
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
          :disabled="saving"
          :error-messages="keyError ?? undefined"
          :hide-details="keyError === null"
          label="代號"
          variant="outlined"
          @keydown.enter="submit"
        />

        <v-checkbox
          v-model="virtual"
          density="compact"
          :disabled="saving"
          hide-details
          label="虛擬表"
        />

        <v-text-field
          v-if="!virtual"
          v-model="prefix"
          autocomplete="off"
          class="new-table-dialog__code"
          density="compact"
          :disabled="saving"
          :error-messages="prefixError ?? undefined"
          :hide-details="prefixError === null"
          label="主鍵字首"
          variant="outlined"
          @keydown.enter="submit"
        />

        <div v-if="virtual" class="text-caption text-medium-emphasis">
          <p>代號建立後無法在編輯器中修改。</p>
          <p>虛擬表唯讀，列由規則從其他表產生。新表內建一個欄位，沒有規則。不會建立頁面。</p>
          <p>建立後立即寫入。不需要加入 Config.gs 與本地測試的 CSV。</p>
        </div>

        <div v-else class="text-caption text-medium-emphasis">
          <p>代號建立後無法在編輯器中修改。</p>
          <p>新表內建主鍵與名稱兩個欄位，並建立本地測試的 CSV。不會建立頁面。</p>
          <p>建立後立即寫入。Config.gs 的登記請自行加入。</p>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" text="取消" @click="open = false" />

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
