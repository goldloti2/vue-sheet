<script lang="ts" setup>
  import { computed } from 'vue'
  import { useFilesStore } from '@/stores/files'

  const store = useFilesStore()
  const confirm = computed(() => store.saveConfirm)
</script>

<template>
  <v-dialog max-width="520" :model-value="confirm !== null" persistent>
    <v-card v-if="confirm" title="儲存欄位的修改">
      <v-card-text class="text-body-2">
        <p>你修改了欄位。請確認用到這些欄位的地方都已修改，否則可能發生預期外的問題。</p>

        <div v-for="change in confirm.changes" :key="change.path" class="mt-3">
          <div class="font-weight-medium">{{ change.title }}</div>

          <ul class="save-confirm-dialog__list">
            <li v-for="item in change.items" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div v-if="confirm.unsavedLinked.length > 0" class="mt-3">
          <div class="font-weight-medium">下列檔案隨欄位一起修改，這次不會儲存，請一併儲存：</div>

          <ul class="save-confirm-dialog__list">
            <li v-for="path in confirm.unsavedLinked" :key="path">{{ store.locationOf(path) }}</li>
          </ul>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="取消" @click="store.cancelSave()" />
        <v-btn color="primary" text="儲存" @click="store.confirmSave()" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.save-confirm-dialog__list {
  padding-left: 20px;
}
</style>
