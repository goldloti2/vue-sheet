<script lang="ts" setup>
  import type { HeaderChange } from '@/composables/useSchemaForm'
  import { shallowRef } from 'vue'

  defineProps<{
    oldLabel: string
    label: string
    /** 欄位為主鍵 */
    isId: boolean
    /** 表的 mock CSV。沒有時為 null */
    csvPath: string | null
  }>()

  const emit = defineEmits<{
    choose: [change: HeaderChange]
    cancel: []
  }>()

  const change = shallowRef<HeaderChange>('sheet')
  const saving = shallowRef(false)

  function confirm (): void {
    saving.value = true
    emit('choose', change.value)
  }
</script>

<template>
  <v-dialog max-width="480" :model-value="true" persistent>
    <v-card title="修改標籤">
      <v-card-text class="text-body-2">
        <p>此欄位沒有 Sheet 表頭，標籤即為 Sheet 的表頭。</p>

        <v-radio-group v-model="change" class="mt-2" hide-details>
          <v-radio value="sheet">
            <template #label>
              <div>
                <div>修改 Sheet 的表頭</div>

                <div class="text-caption text-medium-emphasis">
                  請自行把 Sheet 的表頭「{{ oldLabel }}」改為「{{ label }}」。
                  <template v-if="csvPath">本地測試的 CSV 的表頭一併修改。</template>
                </div>
              </div>
            </template>
          </v-radio>

          <v-radio value="keep">
            <template #label>
              <div>
                <div>保留 Sheet 的表頭</div>
                <div class="text-caption text-medium-emphasis">加上 Sheet 表頭「{{ oldLabel }}」，只修改畫面上的標籤。</div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>

        <v-alert
          v-if="isId && change === 'sheet'"
          class="mt-3"
          density="compact"
          type="info"
          variant="tonal"
        >
          此欄位為主鍵。Config.gs 中此表的 idColumn 為「{{ oldLabel }}」時，一併改為「{{ label }}」。
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" text="取消" @click="emit('cancel')" />

        <v-btn
          color="primary"
          :loading="saving"
          text="確定"
          @click="confirm"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
