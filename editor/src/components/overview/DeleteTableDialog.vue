<script lang="ts" setup>
  import { computed, shallowRef } from 'vue'
  import { useTableDialogs } from '@/composables/useTableDialogs'
  import { useTableFiles } from '@/composables/useTableFiles'
  import { useFilesStore } from '@/stores/files'
  import { pageRoutes } from '../../../shared/navigationForm'
  import { tableDeletionFiles } from '../../../shared/tableFiles'

  const files = useFilesStore()
  const tables = useTableFiles()
  const { deletingTable } = useTableDialogs()
  const saving = shallowRef(false)

  const open = computed({
    get: () => deletingTable.value !== null,
    set: value => {
      if (!value) {
        deletingTable.value = null
      }
    },
  })
  const key = computed(() => deletingTable.value ?? '')
  const title = computed(() => files.tableLabels[key.value] ?? key.value)
  const deleted = computed(() => tableDeletionFiles(key.value, files.paths, files.mockCsv))
  const registered = computed(() => files.tableOrder.includes(key.value))
  const inConfig = computed(() => files.configTables?.[key.value] !== undefined)
  // 導覽中連到被刪除的頁面的項目
  const navTitles = computed(() => {
    const routes = pageRoutes(deleted.value)
    return (files.navLinks ?? []).filter(link => link.to !== null && routes.includes(link.to)).map(link => link.title ?? link.to)
  })

  async function remove (): Promise<void> {
    saving.value = true
    const removed = await tables.remove(key.value, deleted.value)
    saving.value = false
    if (removed) {
      open.value = false
    }
  }
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card :title="`刪除表 ${title}`">
      <v-card-text class="text-body-2">
        <p>下列檔案一併刪除：</p>

        <ul class="delete-table-dialog__list">
          <li v-for="path in deleted" :key="path">{{ files.locationOf(path) }}</li>
        </ul>

        <template v-if="registered || files.mockCsv[key] || inConfig || navTitles.length > 0">
          <p class="mt-3">下列登記一併刪除：</p>

          <ul class="delete-table-dialog__list">
            <li v-if="registered">總覽（schemas）中的 {{ key }}</li>
            <li v-if="files.mockCsv[key]">本地測試的 CSV 的登記</li>
            <li v-if="inConfig">後端（Config.gs）中的 {{ key }}</li>
            <li v-for="(navTitle, index) in navTitles" :key="index">導覽中的「{{ navTitle }}」</li>
          </ul>
        </template>

        <p class="mt-3">其他引用此表的地方列於問題分頁，請自行修改，例如其他表的 refTable。</p>
        <p class="mt-2 text-error">刪除後立即寫入，無法在編輯器中還原。</p>
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

<style scoped>
.delete-table-dialog__list {
  padding-left: 20px;
}
</style>
