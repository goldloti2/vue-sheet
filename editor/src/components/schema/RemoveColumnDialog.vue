<script lang="ts" setup>
  import { inject, shallowRef } from 'vue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { useFilesStore } from '@/stores/files'

  const props = defineProps<{
    columnKey: string
    label: string | null
  }>()

  const open = defineModel<boolean>({ required: true })

  const form = inject(SCHEMA_FORM_KEY)!
  const files = useFilesStore()
  const saving = shallowRef(false)

  async function remove (): Promise<void> {
    saving.value = true
    const error = await form.apply([{ kind: 'removeColumn', key: props.columnKey }], 'now')
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
    <v-card :title="`刪除欄位 ${label ?? columnKey}`">
      <v-card-text class="text-body-2">
        <p>同一個檔案中引用此欄位的設定一併刪除，例如搜尋與排序、稱呼、條件式格式套用的欄位。</p>
        <p class="mt-2">其他檔案中的引用列於問題分頁，請自行修改。</p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="取消" @click="open = false" />

        <v-btn
          color="error"
          :loading="saving"
          text="刪除"
          @click="remove"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
